# BUCS PolicyPulse Implementation Plan (MVP, rev. 2 — zero-cost edition)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build BUCS PolicyPulse — a RAG-powered institutional policy assistant (streaming chat, citations, RBAC retrieval, feedback, admin panel) — as a **personal project running entirely on free tiers: no server cost, no API cost**. The admin makes the chat work by doing exactly two things in the UI: paste one free LLM API key, upload a policy PDF.

**Architecture:** Next.js App Router app (repo root) on **Vercel Hobby** (Fluid compute, 300s function ceiling incl. streaming) + **Supabase Free** (auth, Postgres + pgvector, storage; 500 MB DB / 1 GB storage / pauses after 1 week idle → daily keep-alive cron). AI layer is the **Vercel AI SDK** (`ai`) with the **Google Gemini** provider: one admin-entered AI Studio key (stored in the DB, never in env) powers both streaming chat (`streamText`) and embeddings (`gemini-embedding-001` @ 768 dims via MRL truncation). Default retrieval is **single-call RAG** (retrieve → inject numbered excerpts → one streamed completion with `[n]` citations) — one LLM request per message, which is what free-tier rate limits want; an optional "agentic" mode adds tool-calling retrieval.

**Tech Stack:** Next.js 15 (TS, Tailwind), `@supabase/supabase-js` + `@supabase/ssr`, `ai` + `@ai-sdk/google` + `@ai-sdk/react`, `llamaindex` (`SentenceSplitter` for chunking only), `unpdf`, `react-markdown` + `remark-gfm`, `vitest`. Design system per `DESIGN.md`; screens per `docs/superpowers/specs/2026-07-19-policypulse-uiux-design.md`.

## Why Gemini (research-verified 2026-07-19, see Appendix A)

- **One key, whole pipeline.** Gemini's AI Studio Free tier needs no billing account, and the same key serves Flash-class chat models *and* the `gemini-embedding-001` embedding model. It is the only surveyed provider (vs Groq, OpenRouter, Cerebras, Mistral) where a single admin-entered key runs everything — Groq has no embeddings endpoint at all.
- **Recommended chat model:** `gemini-2.5-flash` (default), with `gemini-2.5-flash-lite` selectable for higher request budgets. Flash-class models remain on the free tier (Pro-class moved behind billing ~Apr 2026). Google no longer publishes exact free RPM/RPD numbers — the admin checks their own project's limits at aistudio.google.com/rate-limit; the app handles 429s gracefully regardless.
- **Runner-up (documented, deferred):** Groq free tier for chat (`llama-3.1-8b-instant`, 14,400 req/day) + in-process `Supabase/gte-small` embeddings via transformers.js (384 dims, no key). Not in v1: it needs a second embedding pipeline and a different vector dimension.

## Global Constraints

- Supabase project: **BUCS PolicyPulse**, ref `ujmzmmgjqdgywhdhrfgx`. All schema changes via `mcp__supabase__apply_migration` (project-scoped `.mcp.json` at repo root — verify with `get_project_url` before applying anything).
- Env vars (`.env.local`): only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. **No AI keys in env** — the Gemini key lives in `public.ai_settings` (service-role-only table) and is entered in Admin → AI Settings.
- **Embedding config is LOCKED at first ingest:** `gemini-embedding-001`, `outputDimensionality: 768`, column `vector(768)`. Sub-3072-dim Gemini vectors are NOT normalized — every embedding (documents *and* queries) must be L2-normalized in code before use. Changing model or dims later requires re-indexing every document (`gemini-embedding-001` and `gemini-embedding-2` spaces are incompatible).
- 768 dims (not 1536/3072): fits pgvector's <2000-dim HNSW index limit with headroom and stretches the 500 MB Free-plan database (~3 KB/vector vs 12 KB at 3072).
- Free-tier honesty is a product requirement (see PRODUCT.md): 429 → visible "retrying in Ns" notice with one auto-retry; missing/invalid key → offline notice with admin fix link; never a dead spinner.
- **Access is restricted to Bicol University accounts:** only `@bicol-u.edu.ph` emails can sign up, enforced by a database trigger on `auth.users` (not just UI validation, so it can't be bypassed via the API). A `public.email_allowlist` table grants exceptions — it must be seeded with the owner's admin email before that account is created, or the admin locks themself out.
- Roles & visibility unchanged: `student|faculty|admin`; student→`{student}`, faculty→`{student,faculty}`, admin→all.
- Answers grounded + cited `[n]`; no answer in corpus → say so + offer escalation.
- Node runtime for AI routes; `export const maxDuration = 300` (Vercel Hobby Fluid ceiling).
- Visuals: implement `DESIGN.md` tokens verbatim (OKLCH, both themes); every interactive component ships default/hover/focus/active/disabled/loading states; WCAG AA; `prefers-reduced-motion` honored.

---

## Phase 0 — Environment verification

### Task 0.1: Reconnect Supabase MCP to the correct project

- [ ] **Step 1:** Restart the Claude Code session (or `/mcp` → reconnect); approve the project-scoped `supabase` server from `.mcp.json`.
- [ ] **Step 2:** `mcp__supabase__get_project_url` → must be `https://ujmzmmgjqdgywhdhrfgx.supabase.co`. If it shows `dcnpuvtbftpbcjcvfnlt`, STOP — wrong project.
- [ ] **Step 3:** `mcp__supabase__list_tables` (`public`) → empty; if not, report to owner before proceeding.

---

## Phase 1 — Database schema

### Task 1.1: Roles, profiles, auth trigger

Unchanged from rev. 1. Apply migration `0001_roles_profiles`:

```sql
create extension if not exists vector with schema extensions;

create type public.user_role as enum ('student', 'faculty', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid(); $$;

create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: admin read all" on public.profiles for select using (public.is_admin());
create policy "profiles: admin update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Access restriction: only @bicol-u.edu.ph accounts, plus explicit exceptions
create table public.email_allowlist (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.email_allowlist enable row level security;
create policy "allowlist: admin all" on public.email_allowlist
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.enforce_email_domain()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;
  if lower(new.email) like '%@bicol-u.edu.ph'
     or exists (select 1 from public.email_allowlist a where lower(a.email) = lower(new.email)) then
    return new;
  end if;
  raise exception 'Sign-ups are restricted to @bicol-u.edu.ph email addresses';
end;
$$;

-- BEFORE trigger: fires for dashboard-created users and API sign-ups alike,
-- and blocks changing an existing account's email to an outside domain
create trigger enforce_email_domain_on_signup
  before insert or update of email on auth.users
  for each row execute function public.enforce_email_domain();
```

- [ ] Verify: `select public.is_admin();` → `false`; `list_tables` shows `profiles` + `email_allowlist` with RLS.
- [ ] **Seed the owner exception NOW** (before Task 1.4 creates the admin account): `execute_sql` → `insert into public.email_allowlist (email, note) values ('<owner-admin-email>', 'project owner / admin');`
- [ ] Negative test: `execute_sql` → try `insert into auth.users` is not how signups happen, so test via the dashboard instead in Task 1.4: adding a user with an outside, non-allowlisted email must fail with the restriction message.

### Task 1.2: Documents, chunks (768-dim), vector search, storage

Apply migration `0002_documents_vector_search` — **note `vector(768)` everywhere**:

```sql
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null unique,
  mime_type text not null,
  audience public.user_role[] not null default '{student,faculty,admin}',
  status text not null default 'pending'
    check (status in ('pending','processing','indexed','failed')),
  error text,
  chunk_count int not null default 0,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "documents: admin all" on public.documents
  for all using (public.is_admin()) with check (public.is_admin());
create policy "documents: users read indexed for their role" on public.documents
  for select using (status = 'indexed' and audience @> array[public.my_role()]);

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(768),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);
alter table public.document_chunks enable row level security;
create policy "chunks: admin read" on public.document_chunks
  for select using (public.is_admin());

create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_document_chunks(
  query_embedding extensions.vector(768),
  match_threshold float default 0.3,
  match_count int default 8,
  allowed_roles public.user_role[] default '{student}'
)
returns table (id uuid, document_id uuid, document_title text, chunk_index int, content text, similarity float)
language sql stable set search_path = ''
as $$
  select c.id, c.document_id, d.title, c.chunk_index, c.content,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where d.status = 'indexed'
    and d.audience && allowed_roles
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

insert into storage.buckets (id, name, public)
values ('policy-documents', 'policy-documents', false)
on conflict (id) do nothing;

create policy "storage: admin manage policy files" on storage.objects
  for all using (bucket_id = 'policy-documents' and public.is_admin())
  with check (bucket_id = 'policy-documents' and public.is_admin());
```

- [ ] Verify: `select public.match_document_chunks(array_fill(0.0, array[768])::extensions.vector(768));` → 0 rows, no error.

### Task 1.3: AI settings, chat, feedback, escalations, retrieval settings

Apply migration `0003_ai_chat_feedback_settings`. **`ai_settings` has RLS enabled and NO policies** — the API key is unreachable through the client API entirely; only the service-role server client touches it.

```sql
create table public.ai_settings (
  id int primary key default 1 check (id = 1),
  provider text not null default 'gemini' check (provider in ('gemini')),
  chat_model text not null default 'gemini-2.5-flash',
  api_key text,
  verified_at timestamptz,
  retrieval_mode text not null default 'single_call'
    check (retrieval_mode in ('single_call','agentic')),
  updated_at timestamptz not null default now()
);
alter table public.ai_settings enable row level security;
-- deliberately NO policies: service-role access only
insert into public.ai_settings (id) values (1);

create table public.rag_settings (
  id int primary key default 1 check (id = 1),
  chunk_size int not null default 1024 check (chunk_size between 128 and 4096),
  chunk_overlap int not null default 200 check (chunk_overlap >= 0),
  match_threshold float not null default 0.3 check (match_threshold between 0 and 1),
  match_count int not null default 6 check (match_count between 1 and 20),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
alter table public.rag_settings enable row level security;
create policy "rag_settings: admin all" on public.rag_settings
  for all using (public.is_admin()) with check (public.is_admin());
insert into public.rag_settings (id) values (1);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_sessions enable row level security;
create policy "chat_sessions: owner all" on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "chat_sessions: admin read" on public.chat_sessions
  for select using (public.is_admin());

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "chat_messages: owner all" on public.chat_messages
  for all using (exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "chat_messages: admin read" on public.chat_messages
  for select using (public.is_admin());

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating text not null check (rating in ('up','down')),
  comment text,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);
alter table public.feedback enable row level security;
create policy "feedback: owner insert" on public.feedback for insert with check (auth.uid() = user_id);
create policy "feedback: owner read" on public.feedback for select using (auth.uid() = user_id);
create policy "feedback: admin read" on public.feedback for select using (public.is_admin());

create table public.escalations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.chat_sessions (id) on delete set null,
  question text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  created_at timestamptz not null default now()
);
alter table public.escalations enable row level security;
create policy "escalations: owner insert" on public.escalations for insert with check (auth.uid() = user_id);
create policy "escalations: owner read" on public.escalations for select using (auth.uid() = user_id);
create policy "escalations: admin all" on public.escalations
  for all using (public.is_admin()) with check (public.is_admin());
```

- [ ] Verify: `select provider, chat_model from public.ai_settings;` (via MCP = service context) → `gemini, gemini-2.5-flash`. From the app's anon context later, `ai_settings` must return zero rows/permission error.
- [ ] Run `mcp__supabase__get_advisors` (security); fix flags.

### Task 1.4: First admin user

- [ ] **Precondition:** the owner's email is in `public.email_allowlist` (Task 1.1 seed step) — otherwise the domain trigger rejects the account.
- [ ] Dashboard → Authentication → Add user (owner's email), then `update public.profiles set role='admin' where email='<owner-email>';` → verify.
- [ ] Negative test: Dashboard → Add user with a non-allowlisted outside email (e.g. `test@gmail.com`) → must fail with "Sign-ups are restricted to @bicol-u.edu.ph email addresses". Delete nothing; the rejection is the pass.

---

## Phase 2 — Scaffold, design foundation, auth

### Task 2.1: Scaffold Next.js at repo root

- [ ] **Step 1:** Hold aside non-allowlisted files, scaffold, restore (PowerShell):

```powershell
New-Item -ItemType Directory -Force _hold
Move-Item '.env.local','.mcp.json','BUCS PolicyPulse.md','PRODUCT.md','DESIGN.md' _hold/
npx create-next-app@latest . --ts --app --tailwind --eslint --src-dir --import-alias "@/*" --use-npm
Move-Item '_hold/*' . -Force; Remove-Item _hold
```

- [ ] **Step 2:** Install deps:

```powershell
npm install @supabase/supabase-js @supabase/ssr ai @ai-sdk/google @ai-sdk/react llamaindex unpdf react-markdown remark-gfm server-only
npm install -D vitest
```

- [ ] **Step 3:** Add `"test": "vitest run"` script. `npm run dev` renders starter → stop. Commit.

### Task 2.2: Design tokens + fonts + primitives (DESIGN.md → code)

**Files:** Modify `src/app/globals.css`, `src/app/layout.tsx`; Create `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/status-pill.tsx`, `src/components/ui/toast.tsx`, `src/components/theme-toggle.tsx`.

- [ ] **Step 1:** `globals.css`: define every DESIGN.md token as CSS custom properties in `:root` (light) and `.dark` (dark), map into Tailwind v4 `@theme inline` (`--color-bg: var(--bg)` etc.), semantic z-scale, motion variables, `@media (prefers-reduced-motion: reduce)` global override.
- [ ] **Step 2:** `layout.tsx`: `next/font` Inter (variable, `--font-sans`) + Source Serif 4 (`--font-serif`, subset to weights 600/700); viewport meta `viewport-fit=cover, interactive-widget=resizes-content`; inline no-flash theme script (reads `localStorage.theme` ?? system, sets `.dark` before paint).
- [ ] **Step 3:** Primitives per DESIGN.md components section: `Button` (primary/secondary/ghost/danger × all states, 44px touch target), `Dialog` (native `<dialog>`, fade+rise 200ms, focus trap comes free), `StatusPill`, `Toast` (context + hook), `ThemeToggle` (persists override).
- [ ] **Step 4:** Verify in a scratch page at every breakpoint (375/768/1440): contrast spot-check body text ≥4.5:1 both themes; focus rings visible; reduced-motion kills transitions. Commit.

### Task 2.3: Supabase clients, middleware, auth, RBAC

Unchanged from rev. 1 (Files: `src/lib/supabase/{client,server,admin}.ts`, `src/lib/auth.ts`, `src/middleware.ts`, `src/app/login/*`; Test: `audienceFor` role→audience mapping in `src/lib/__tests__/auth.test.ts` — student `['student']`, faculty `['student','faculty']`, admin all three). Login page styled per design spec (centered card, serif heading, inline errors).

**Domain restriction UX** (the Task 1.1 DB trigger is the enforcement; this is the friendly layer):

- Add `isAllowedSignupEmail(email: string): boolean` to `src/lib/auth.ts` — `email.trim().toLowerCase().endsWith('@bicol-u.edu.ph')` — with unit tests: accepts `juan@bicol-u.edu.ph` and `JUAN@BICOL-U.EDU.PH`; rejects `juan@gmail.com` and the lookalike `juan@notbicol-u.edu.ph`.
- Sign-up form: helper text under the email field — "Use your @bicol-u.edu.ph school email." The `signup` server action pre-checks `isAllowedSignupEmail` and returns the inline error "PolicyPulse is only available to Bicol University accounts — sign up with your @bicol-u.edu.ph email." before calling Supabase; if the DB trigger still rejects (API bypass), map that error to the same message. Sign-**in** is not domain-checked (the allowlisted admin must be able to log in).

- [ ] TDD steps as rev. 1 + `isAllowedSignupEmail` cases; verify sign-in redirect + `/login` gate + outside-domain signup shows the friendly inline error; commit.

---

## Phase 3 — AI config + ingestion

### Task 3.1: AI config module (the "one key" core)

**Files:** Create `src/lib/ai/config.ts`; Test `src/lib/ai/__tests__/config.test.ts` (masking helper).

**Interfaces:** `getAiConfig(): Promise<AiConfig>` (throws `AiNotConfiguredError` when no key), `AiConfig = { provider:'gemini'; chatModel:string; apiKey:string; retrievalMode:'single_call'|'agentic' }`, `gemini(apiKey)` → provider instance, `maskKey(key): string` (`•••• …last4`).

```ts
import 'server-only'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAdminClient } from '@/lib/supabase/admin'

export class AiNotConfiguredError extends Error {}

export interface AiConfig {
  provider: 'gemini'
  chatModel: string
  apiKey: string
  retrievalMode: 'single_call' | 'agentic'
}

export async function getAiConfig(): Promise<AiConfig> {
  const admin = createAdminClient()
  const { data, error } = await admin.from('ai_settings').select('*').eq('id', 1).single()
  if (error) throw new Error(`ai_settings read failed: ${error.message}`)
  if (!data.api_key) throw new AiNotConfiguredError('LLM API key not configured')
  return {
    provider: data.provider,
    chatModel: data.chat_model,
    apiKey: data.api_key,
    retrievalMode: data.retrieval_mode,
  }
}

export function gemini(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey })
}

export function maskKey(key: string): string {
  return key.length <= 4 ? '••••' : `••••••••${key.slice(-4)}`
}
```

- [ ] TDD `maskKey`; commit.

### Task 3.2: Extraction, chunking, embedding (with normalization + backoff)

**Files:** Create `src/lib/rag/ingest.ts`, `src/lib/rag/settings.ts`; Test `src/lib/rag/__tests__/ingest.test.ts` (chunking + `l2normalize` unit vector check).

```ts
import { SentenceSplitter } from 'llamaindex'
import { embedMany } from 'ai'
import { extractText as unpdfExtract, getDocumentProxy } from 'unpdf'
import { gemini } from '@/lib/ai/config'

// LOCKED after first ingest — changing either requires re-indexing all documents
export const EMBEDDING_MODEL = 'gemini-embedding-001'
export const EMBEDDING_DIMENSIONS = 768

export async function extractDocText(buffer: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const pdf = await getDocumentProxy(buffer)
    const { text } = await unpdfExtract(pdf, { mergePages: true })
    return text
  }
  return new TextDecoder().decode(buffer)
}

export function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  return new SentenceSplitter({ chunkSize, chunkOverlap }).splitText(text)
}

// Gemini sub-3072-dim embeddings are NOT normalized — required before cosine similarity
export function l2normalize(v: number[]): number[] {
  let sum = 0
  for (const x of v) sum += x * x
  const norm = Math.sqrt(sum) || 1
  return v.map((x) => x / norm)
}

async function withBackoff<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      const status = (e as { statusCode?: number; status?: number })
      const code = status.statusCode ?? status.status
      if (code !== 429 || i >= tries - 1) throw e
      await new Promise((r) => setTimeout(r, 2 ** i * 5000)) // 5s, 10s, 20s — free-tier friendly
    }
  }
}

export async function embedTexts(
  apiKey: string,
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[][]> {
  const google = gemini(apiKey)
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 20) {
    const batch = texts.slice(i, i + 20)
    const { embeddings } = await withBackoff(() =>
      embedMany({
        model: google.textEmbedding(EMBEDDING_MODEL),
        values: batch,
        providerOptions: {
          google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType },
        },
      }),
    )
    out.push(...embeddings.map(l2normalize))
  }
  return out
}
```

`settings.ts` (`getRagSettings(admin)`) unchanged from rev. 1.

- [ ] TDD chunking + normalize (‖v‖≈1 after normalize); verify the `providerOptions.google` key names against the installed `@ai-sdk/google` docs before finalizing (SDK option naming shifts between majors). Commit.

### Task 3.3: Upload UI + ingest runner

As rev. 1 Task 3.2 with two changes: `runIngest(admin, documentId)` extracted to `src/lib/rag/ingest-runner.ts` (called by both the `/api/ingest` route and the upload server action), and embedding now needs the key — `const cfg = await getAiConfig()` at the top; when it throws `AiNotConfiguredError`, mark the document `failed` with error `"Add your Gemini API key in AI Settings first"`. Route keeps `runtime='nodejs'`, `maxDuration=300`.

- [ ] End-to-end verify with a real PDF (as admin, after Task 6.2 saves a key — or temporarily via a seeded key): document reaches `indexed`, `select count(*) from document_chunks` > 0, and `select l2 from (select sqrt(sum(x*x)) as l2 from unnest((select embedding from public.document_chunks limit 1)::float4[]) x) s;` ≈ 1. Commit.

---

## Phase 4 — Retrieval + chat core

### Task 4.1: Retrieval + citations

**Files:** `src/lib/rag/retrieve.ts`, `src/lib/rag/citations.ts`; tests as rev. 1 (`assignCitations` stable refs).

`searchPolicies(admin, apiKey, query, role, settings)`: `embedTexts(apiKey, [query], 'RETRIEVAL_QUERY')` → RPC `match_document_chunks` with `allowed_roles: audienceFor(role)`. `Citation`/`assignCitations` identical to rev. 1.

- [ ] TDD; commit.

### Task 4.2: Chat route — single-call RAG default, streaming via AI SDK

**Files:** Create `src/app/api/chat/route.ts`, `src/lib/rag/prompt.ts`.

**Interfaces:** `POST /api/chat` accepts the AI SDK `useChat` payload + `{ sessionId? }`; responds with a UI message stream. Citations ride on **assistant message metadata** (`{ citations: Citation[] }`); errors surface as stream error parts with friendly text; both turns + citations persisted server-side in `onFinish`.

- [ ] **Step 1:** `prompt.ts` — grounding prompt (single-call variant):

```ts
export function buildSystemPrompt(excerpts: string): string {
  return `You are PolicyPulse, the official policy assistant for BUCS.

Numbered policy excerpts retrieved for this question:
${excerpts || '(none found)'}

Rules:
- Answer ONLY from the excerpts above. Cite every claim with its bracketed ref, e.g. "Grades are final after 14 days [1]."
- If the excerpts don't contain the answer, say so plainly and tell the user they can send the question to an administrator with the "Ask a human" button. Never invent policy content.
- Greetings / questions about using this assistant may be answered without excerpts.
- Respond in Markdown. Be focused and readable.`
}
```

- [ ] **Step 2:** Route skeleton:

```ts
import { convertToModelMessages, streamText } from 'ai'
import { AiNotConfiguredError, getAiConfig, gemini } from '@/lib/ai/config'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRagSettings } from '@/lib/rag/settings'
import { searchPolicies } from '@/lib/rag/retrieve'
import { assignCitations } from '@/lib/rag/citations'
import { buildSystemPrompt } from '@/lib/rag/prompt'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: Request) {
  let ctx
  try { ctx = await requireUser() } catch (res) { return res as Response }
  const { messages, sessionId: incomingSessionId } = await req.json()
  const admin = createAdminClient()

  let cfg
  try { cfg = await getAiConfig() } catch (e) {
    const offline = e instanceof AiNotConfiguredError
    return Response.json(
      { error: offline ? 'assistant_offline' : 'config_error' },
      { status: 503 },
    )
  }

  const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
  const question = extractText(lastUser) // helper: concat text parts

  // resolve session (create on first message), load nothing else — client sends history
  const sessionId = incomingSessionId ?? (await createSession(admin, ctx.user.id, question))

  const settings = await getRagSettings(admin)
  const results = await searchPolicies(admin, cfg.apiKey, question, ctx.role, settings)
  const { citations, forModel } = assignCitations([], results)
  const excerpts = forModel.map((r) => `[${r.ref}] (${r.source}) ${r.content}`).join('\n\n')

  const result = streamText({
    model: gemini(cfg.apiKey)(cfg.chatModel),
    system: buildSystemPrompt(excerpts),
    messages: convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) =>
      part.type === 'finish' ? { citations: usedOnly(citations, /* final text */ part) , sessionId } : undefined,
    onFinish: async ({ responseMessage }) => {
      await persistTurn(admin, sessionId, question, responseMessage, citations)
    },
    onError: (e) => friendlyError(e), // 429 → "Free-tier limit reached — try again in a moment."
  })
}
```

- [ ] **Step 3 (API verification, required):** the exact `toUIMessageStreamResponse` hooks (`messageMetadata`, `onFinish` signature, error mapping) move between AI SDK majors — verify against the installed `ai` package docs/types and adjust. Filter citations to the refs actually present in the final text before persisting/sending (as rev. 1: regex `\[(\d+)\]`).
- [ ] **Step 4 (agentic mode):** when `cfg.retrievalMode === 'agentic'`, skip pre-retrieval; pass `tools: { search_policies }` (a `tool()` wrapping `searchPolicies`, accumulating citations across calls) + `stopWhen: stepCountAtMost(4)` and the rev. 1 tool-based system prompt. Default stays `single_call` — one LLM request per message respects free RPM/RPD budgets.
- [ ] **Step 5:** `npm run build` clean; commit.

---

## Phase 5 — Chat UI (implements the design spec exactly)

### Task 5.1: App shell + welcome + streaming chat

**Files:** `src/app/page.tsx`, `src/components/chat/{chat-app,message-list,composer,welcome}.tsx` — using `useChat` from `@ai-sdk/react` (transport → `/api/chat`, body carries `sessionId`).

- [ ] Shell per DESIGN.md: persistent 288px sidebar ≥1024px; drawer + sticky top bar <768px (native `<dialog>` or focus-trapped aside, Escape/overlay close); chat column max 46rem.
- [ ] Welcome state: serif heading, 4 suggested prompts (2×2 ≥640px); if no indexed docs or assistant offline (503 from route / server-checked flag), swap in the informative empty state (admin sees deep links to `/admin/documents` / `/admin/settings`).
- [ ] Messages: user = `--surface-2` bubbles right; assistant = full-column markdown (`react-markdown` + `remark-gfm`, styles per DESIGN.md); streaming caret (reduced-motion: static ▍); auto-scroll only when already at bottom + "jump to latest" pill; stop button while streaming.
- [ ] Degraded states: stream error part → inline notice with retry (429 copy: "Free-tier limit reached — retrying…", one auto-retry); offline → registrar-plain notice.
- [ ] Verify at 375/768/1440 + keyboard-only pass; commit.

### Task 5.2: Citations UI

**Files:** `src/components/chat/citations.tsx`; wire from assistant message metadata.

- [ ] Chip row (`--accent-subtle` pills, ref number in `--accent`); tap/Enter expands ONE quote block inline (`aria-expanded`, grid-rows animation, reduced-motion instant); works identically on historical messages (citations come from `chat_messages.citations`).
- [ ] Verify with a real indexed PDF: refs in text match chips; snippets are the actual retrieved excerpts. Commit.

### Task 5.3: Session sidebar + history

As rev. 1 Task 5.2 (sessions list via RLS-scoped client, `/api/sessions/[id]` GET hydrates messages + citations, skeleton rows, delete with confirm) + `sessionId` returned in message metadata feeds `useChat` body for subsequent turns.

### Task 5.4: Feedback + escalation

As rev. 1 Task 5.3, styled per spec: 👍 instant, 👎 dialog/bottom-sheet with textarea; "Ask a human" header button + auto-card when an answer has zero citations; `POST /api/feedback`, `POST /api/escalations` (cookie-authed, RLS-enforced). Verify rows land; commit.

---

## Phase 6 — Admin panel

### Task 6.1: Admin shell + dashboard + setup checklist

As rev. 1 Task 6.1 shell (guarded layout; nav Dashboard/Documents/AI Settings/Feedback/Escalations; tabs <768px) + dashboard = plain two-column definition list (no KPI cards, per PRODUCT.md anti-references) + **setup checklist card** until complete: ① Gemini key saved ✓ ② first document indexed ✓ — each linking to its page.

### Task 6.2: AI Settings — the "one key" page

**Files:** `src/app/admin/settings/page.tsx`, `src/app/admin/settings/actions.ts`.

- [ ] **Step 1:** Server component reads `ai_settings` via admin client (`requireAdmin()`), renders: provider (Gemini, fixed in v1) with helper text — *"Create a free API key at aistudio.google.com — no billing account needed. This one key powers both chat and document indexing."*; masked key field (`maskKey`), model select (`gemini-2.5-flash` default, `gemini-2.5-flash-lite` for higher free limits, free-text override), retrieval mode toggle (single-call default / agentic), retrieval tuning fields (from `rag_settings`, DB-mirrored bounds).
- [ ] **Step 2:** `saveAndVerifyKey` server action: `requireAdmin()` → write key → live probe `generateText({ model, prompt: 'ping', maxOutputTokens: 1 })` → on success set `verified_at`, return ✓ "Key verified — chat is live"; on failure surface the provider error verbatim and clear `verified_at` (key stays saved for retry). Never echo the full key back.
- [ ] **Step 3:** Note on chunk settings: "applies to documents indexed after the change — re-index to apply". Verify: bad key shows provider error; good key flips checklist item ✓ and chat works. Commit.

### Task 6.3: Documents / Feedback / Escalations pages

As rev. 1 (upload panel + status table → stacked cards <640px; feedback table w/ rating filter; escalations open-first with inline resolve). Commit each.

---

## Phase 7 — Deploy free, keep alive, harden

### Task 7.1: Vercel Hobby deploy + Supabase keep-alive

- [ ] **Step 1:** Create `src/app/api/keepalive/route.ts`: service-role `select id from rag_settings limit 1` → `{ ok: true }`. Add `vercel.json`:

```json
{ "crons": [{ "path": "/api/keepalive", "schedule": "0 9 * * *" }] }
```

One daily DB hit keeps the Supabase Free project from its 1-week-inactivity pause (Hobby cron: daily precision, ≤2 jobs — fits). Guard the route with a header check (`CRON_SECRET` env, Vercel sets `Authorization: Bearer`).

- [ ] **Step 2:** Deploy: `npx vercel` → link project → set env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET`) → `npx vercel --prod`. New project ⇒ Fluid compute on by default ⇒ 300s ceiling applies. Add the Vercel URL to Supabase Auth → URL Configuration (site URL + redirect).
- [ ] **Step 3:** Verify on the deployed URL: login → paste key → upload PDF → indexed → cited streamed answer on a phone.

### Task 7.2: Hardening checklist

- [ ] `npm run build` + `npm test` clean; `get_advisors` (security + performance) resolved.
- [ ] Key safety: `ai_settings` unreachable from client API (probe with publishable key → error/empty); full key never in any server response or log; `.env.local` git-ignored.
- [ ] RBAC pass: student cannot surface faculty-only content (audience `{faculty}` doc → "not found" + escalation offer).
- [ ] Domain-restriction pass on the deployed URL: signup with an outside email fails with the friendly message both via the form AND via a raw `supabase.auth.signUp` call from the browser console (proves the DB trigger holds without the UI); a `@bicol-u.edu.ph` signup succeeds; changing an account email to an outside domain is rejected.
- [ ] Free-tier drills: revoke the key in AI Studio → chat shows offline notice, admin sees fix link; hammer requests past RPM → 429 notice + retry works; confirm keep-alive cron ran (Vercel cron logs) after day 1.
- [ ] A11y pass per design spec: keyboard-only full flow, focus visible, reduced-motion, 44px targets, both themes contrast.
- [ ] Walkthrough: fresh signup (student) → ask → cite → feedback → escalate → admin resolves.

## Deferred (post-MVP)

- Groq/OpenRouter chat providers + `Supabase/gte-small` (384-dim, keyless) embedding pipeline as a second locked profile.
- DOCX extraction (`mammoth`); citation → signed-URL page jump; per-session summaries fed into the prompt; email on new escalations.

---

## Appendix A — Research findings this plan relies on (verified live 2026-07-19, 3-0 adversarial votes)

| Fact | Source |
|---|---|
| Gemini Free tier requires only an active project — no billing account; same key serves chat + embeddings | ai.google.dev/gemini-api/docs/rate-limits, /docs/embeddings |
| `gemini-embedding-001` (stable): 3072 dims default, MRL truncation 128–3072 (768/1536/3072 recommended); sub-3072 outputs need manual re-normalization; `-001` and `-2` embedding spaces incompatible | ai.google.dev/gemini-api/docs/embeddings |
| Gemini rate limits are per-project across RPM/TPM/RPD; Google removed concrete free-tier numbers from docs (2026-07-03) — check aistudio.google.com/rate-limit | ai.google.dev/gemini-api/docs/rate-limits |
| Groq free tier (runner-up): `llama-3.1-8b-instant` 30 RPM / 14.4K RPD; `llama-3.3-70b-versatile` 30 RPM / 1K RPD; org-level pooling; no embeddings endpoint | console.groq.com/docs/rate-limits |
| `Supabase/gte-small`: 384 dims, ONNX for transformers.js, officially documented Supabase pattern (keyless fallback embeddings) | supabase.com/docs/guides/ai/vector-columns, huggingface.co/Supabase/gte-small |
| OpenRouter ships first-party `@openrouter/ai-sdk-provider` (v3, targets AI SDK v7) with `streamText`; ':free'-model rate limits unverified | github.com/OpenRouterTeam/ai-sdk-provider |
| Vercel Hobby + Fluid compute: 300s default & max function duration, **including streaming time**; 504 on overrun. Monthly: 4 CPU-hrs, 360 GB-hrs, 1M invocations, 100 GB transfer | vercel.com/docs/functions/limitations, /docs/limits |
| Supabase Free: 500 MB DB (read-only past cap), 1 GB storage, 5 GB egress, paused after 1 week DB inactivity (manual restore, 90-day window); a few DB requests/day keep it active | supabase.com/pricing, /docs/guides/platform/free-project-pausing |

**Open questions carried as plan mitigations:** exact Gemini free RPM/RPD (→ admin checks AI Studio; app 429-handles regardless); free-tier tool-calling reliability (→ single-call RAG is the default, agentic is opt-in); transformers.js cold-start viability on Vercel (→ only matters for the deferred Groq profile).

## Self-review notes

- Spec coverage vs `BUCS PolicyPulse.md` + UI/UX spec: admin panel ✓, doc management/ingestion ✓, RAG config GUI ✓, one-key AI settings w/ live verify ✓, chat (welcome/streaming/markdown/responsive) ✓, citations ✓, RBAC filtering ✓, session sidebar ✓, feedback ✓, escalation ✓, zero-cost hosting + keep-alive ✓, design system ✓, @bicol-u.edu.ph access restriction (DB trigger + allowlist + UX copy) ✓.
- Type consistency: `Citation`/`AiConfig`/`RagSettings`/`UserRole` defined once (4.1/3.1/2.3) and imported; embedding constants defined once in `ingest.ts` and used by retrieval.
- Known risks flagged inline: AI SDK stream-response hook names (4.2 Step 3), `providerOptions.google` naming (3.2), `llamaindex` export paths (3.2), Gemini free limits unpublished (Appendix A).
