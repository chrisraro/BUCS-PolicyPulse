import {
  convertToModelMessages,
  isStepCount,
  streamText,
  tool,
  type UIMessage,
} from 'ai'
import { z } from 'zod'
import { AiNotConfiguredError, chatModelFor, getAiConfig, type AiConfig } from '@/lib/ai/config'
import { requireUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignCitations, citedInText, type Citation } from '@/lib/rag/citations'
import { friendlyError } from '@/lib/rag/friendly-error'
import { buildAgenticSystemPrompt, buildSystemPrompt } from '@/lib/rag/prompt'
import { searchPolicies } from '@/lib/rag/retrieve'
import { getRagSettings, type RagSettings } from '@/lib/rag/settings'
import { textOfParts } from '@/components/chat/message-text'
import type { ChatUIMessage } from '@/components/chat/types'
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
  return textOfParts(message as ChatUIMessage).trim()
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

/**
 * The client supplies `sessionId` on follow-up turns. Since persistence uses
 * the RLS-bypassing admin client, we must independently verify the session
 * belongs to the caller before writing to it — otherwise any authenticated
 * user could append turns to another user's session by guessing/reusing an id.
 */
async function assertSessionOwnership(admin: SupabaseClient, sessionId: string, userId: string) {
  const { data } = await admin
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) {
    throw Response.json({ error: 'session_not_found' }, { status: 404 })
  }
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

  let sessionId: string
  if (body.sessionId) {
    try {
      await assertSessionOwnership(admin, body.sessionId, ctx.user.id)
    } catch (res) {
      return res as Response
    }
    sessionId = body.sessionId
  } else {
    sessionId = await createSession(admin, ctx.user.id, question)
  }

  const model = chatModelFor(cfg.provider, cfg.apiKey, cfg.chatModel)

  // Free-tier token budgets are per-MINUTE (Groq 8b: 6,000 TPM) and count the
  // whole request. Bound both sides: only the most recent turns go to the
  // model (retrieval context is rebuilt per question anyway, so old turns add
  // cost, not grounding), and output is capped.
  const HISTORY_LIMIT = 8
  const recentMessages = body.messages.slice(-HISTORY_LIMIT)
  const MAX_OUTPUT_TOKENS = 1024

  let citations: Citation[] = []

  async function buildResult() {
    return cfg.retrievalMode === 'agentic'
      ? streamText({
          model,
          system: buildAgenticSystemPrompt(),
          messages: await convertToModelMessages(recentMessages),
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          stopWhen: isStepCount(4),
          tools: {
            search_policies: tool({
              description:
                'Search the BUCS policy knowledge base. Returns matching policy excerpts, each with a ref number to cite.',
              inputSchema: z.object({
                query: z.string().describe('Focused search query for the needed policy information'),
              }),
              execute: async ({ query }) => {
                const results = await searchPolicies(admin, query, ctx.role, settings)
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
          // Zero matches from a *successful* call is a normal "(none found …)"
          // outcome and must still reach the model — only a thrown error
          // (e.g. an embedding 429) should short-circuit below.
          const results = await singleCallRetrieve(admin, question, ctx.role, settings)
          const assigned = assignCitations([], results)
          citations = assigned.citations
          const excerpts = assigned.forModel
            .map((r) => `[${r.ref}] (${r.source}) ${r.content}`)
            .join('\n\n')
          return streamText({
            model,
            system: buildSystemPrompt(excerpts),
            messages: await convertToModelMessages(recentMessages),
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          })
        })()
  }

  let result: Awaited<ReturnType<typeof buildResult>>
  try {
    result = await buildResult()
  } catch (e) {
    // Retrieval (or message conversion) failed before streaming could start —
    // do NOT silently answer with empty excerpts (that reads to the model as
    // "the docs don't cover this" and triggers a spurious escalation card).
    // Respond with plain text so the client's classifyChatError shows it
    // verbatim, the same way a mid-stream provider error would.
    return new Response(friendlyError(e), { status: 502 })
  }

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

// Errors here (e.g. an embedding-call 429) are intentionally NOT caught —
// they propagate to the POST handler's try/catch so retrieval failures
// surface as a friendly error instead of being misreported as "not in the
// policy documents". A successful call returning zero matches is unaffected
// and still resolves to `[]` as before.
async function singleCallRetrieve(
  admin: SupabaseClient,
  question: string,
  role: UserRole,
  settings: RagSettings,
) {
  return await searchPolicies(admin, question, role, settings)
}
