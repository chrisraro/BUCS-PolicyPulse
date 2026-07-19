import {
  convertToModelMessages,
  isStepCount,
  streamText,
  tool,
  type UIMessage,
} from 'ai'
import { z } from 'zod'
import { AiNotConfiguredError, gemini, getAiConfig, type AiConfig } from '@/lib/ai/config'
import { requireUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignCitations, citedInText, type Citation } from '@/lib/rag/citations'
import { buildAgenticSystemPrompt, buildSystemPrompt } from '@/lib/rag/prompt'
import { searchPolicies } from '@/lib/rag/retrieve'
import { getRagSettings, type RagSettings } from '@/lib/rag/settings'
import type { UserRole } from '@/lib/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 300

interface ChatRequestBody {
  messages: UIMessage[]
  sessionId?: string
}

function textOf(message: UIMessage | undefined): string {
  if (!message) return ''
  return message.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join(' ')
    .trim()
}

async function createSession(admin: SupabaseClient, userId: string, firstMessage: string) {
  const { data, error } = await admin
    .from('chat_sessions')
    .insert({ user_id: userId, title: firstMessage.slice(0, 60) || 'New chat' })
    .select('id')
    .single()
  if (error) throw new Error(`session create failed: ${error.message}`)
  return data.id as string
}

function friendlyError(error: unknown): string {
  const err = error as { statusCode?: number; status?: number; message?: string }
  const code = err.statusCode ?? err.status
  if (code === 429) return 'Free-tier limit reached — wait a moment and try again.'
  if (code === 401 || code === 403)
    return 'The AI provider rejected the API key — an administrator needs to check it in AI Settings.'
  return 'Something went wrong while answering. Try again.'
}

export async function POST(req: Request) {
  let ctx: Awaited<ReturnType<typeof requireUser>>
  try {
    ctx = await requireUser()
  } catch (res) {
    return res as Response
  }

  const body = (await req.json()) as ChatRequestBody
  const question = textOf([...body.messages].reverse().find((m) => m.role === 'user'))
  if (!question) return Response.json({ error: 'empty_message' }, { status: 400 })

  const admin = createAdminClient()

  let cfg: AiConfig
  try {
    cfg = await getAiConfig()
  } catch (e) {
    return Response.json(
      { error: e instanceof AiNotConfiguredError ? 'assistant_offline' : 'config_error' },
      { status: 503 },
    )
  }

  const settings = await getRagSettings(admin)
  const sessionId = body.sessionId ?? (await createSession(admin, ctx.user.id, question))
  const model = gemini(cfg.apiKey)(cfg.chatModel)

  let citations: Citation[] = []

  const result =
    cfg.retrievalMode === 'agentic'
      ? streamText({
          model,
          system: buildAgenticSystemPrompt(),
          messages: await convertToModelMessages(body.messages),
          stopWhen: isStepCount(4),
          tools: {
            search_policies: tool({
              description:
                'Search the BUCS policy knowledge base. Returns matching policy excerpts, each with a ref number to cite.',
              inputSchema: z.object({
                query: z.string().describe('Focused search query for the needed policy information'),
              }),
              execute: async ({ query }) => {
                const results = await searchPolicies(admin, cfg.apiKey, query, ctx.role, settings)
                const assigned = assignCitations(citations, results)
                citations = assigned.citations
                return assigned.forModel.length
                  ? assigned.forModel
                  : 'No matching policy content found.'
              },
            }),
          },
        })
      : await (async () => {
          const results = await singleCallRetrieve(admin, cfg, question, ctx.role, settings)
          const assigned = assignCitations([], results)
          citations = assigned.citations
          const excerpts = assigned.forModel
            .map((r) => `[${r.ref}] (${r.source}) ${r.content}`)
            .join('\n\n')
          return streamText({
            model,
            system: buildSystemPrompt(excerpts),
            messages: await convertToModelMessages(body.messages),
          })
        })()

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === 'start') return { sessionId }
      if (part.type === 'finish') return { sessionId, citations }
      return undefined
    },
    onEnd: async ({ responseMessage, isAborted }) => {
      if (isAborted) return
      const answer = textOf(responseMessage)
      const used = citedInText(citations, answer)
      try {
        await admin.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: question })
        await admin.from('chat_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: answer,
          citations: used,
        })
        await admin
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId)
      } catch {
        // persistence failure must not break the streamed answer
      }
    },
    onError: friendlyError,
  })
}

async function singleCallRetrieve(
  admin: SupabaseClient,
  cfg: AiConfig,
  question: string,
  role: UserRole,
  settings: RagSettings,
) {
  try {
    return await searchPolicies(admin, cfg.apiKey, question, role, settings)
  } catch {
    // retrieval failure (e.g. embedding 429 after retries) → answer without excerpts
    return []
  }
}
