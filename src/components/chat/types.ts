import type { UIMessage } from 'ai'
import type { Citation } from '@/lib/rag/citations'
import type { UserRole } from '@/lib/auth'

/**
 * Metadata carried on each streamed/hydrated assistant (and, incidentally,
 * user) `UIMessage`. `sessionId`/`citations` ride in on the server's
 * `messageMetadata` hook (see `src/app/api/chat/route.ts`); `dbId` is filled
 * in client-side after the fact by `ChatApp`'s backfill (see chat-app.tsx) —
 * the live stream never carries a database row id.
 */
export interface ChatMessageMetadata {
  sessionId?: string
  citations?: Citation[]
  dbId?: string
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata>

export interface ChatSessionSummary {
  id: string
  title: string
  updated_at: string
}

export interface ChatAppUser {
  name: string
  role: UserRole
}

export type ChatErrorKind = 'offline' | 'config' | 'disconnect' | 'stream'

export interface ClassifiedChatError {
  kind: ChatErrorKind
  message: string
}
