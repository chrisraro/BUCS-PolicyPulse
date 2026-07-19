# BUCS PolicyPulse — UI/UX Design Spec

Personal free-tier project. Register: product. Companion documents: `PRODUCT.md` (strategy), `DESIGN.md` (tokens, components, motion — the implementation source of truth for visuals). This spec defines the screens, flows, and responsive behavior.

## Decisions (confirmed with owner, 2026-07-19)

| Decision | Choice |
|---|---|
| Visual direction | Academic light + dark — pure white / near-black surfaces, deep university blue primary, serif reserved for wordmark + welcome heading |
| App shell | Persistent sidebar on desktop → slide-over drawer on mobile (ChatGPT pattern) |
| Citations | Inline `[n]` markers + numbered source chips under the message; tap expands the exact quoted snippet inline |
| Admin | Dedicated `/admin` area with its own nav |

## Approaches considered

1. **Sidebar + drawer shell (chosen):** proven chat pattern, best use of desktop width, drawer keeps mobile chrome minimal.
2. Single column + bottom tabs: more app-like on phones but unconventional on desktop and wastes width.
3. Hover-popover citations: rejected — hover doesn't exist on touch; the chip+expand pattern works identically on every input type.

## Screens

### 1. Auth (`/login`)
Centered card on `--bg`: serif "BUCS PolicyPulse" heading, tagline, email + password fields, primary "Sign in" button, link toggle to sign-up (adds full-name field). Errors inline under the field, not toasts. No imagery, no split-screen marketing panel.

**Access restriction:** the app is exclusive to Bicol University accounts. Sign-up shows helper text under the email field — "Use your @bicol-u.edu.ph school email" — and an outside-domain attempt gets the inline error "PolicyPulse is only available to Bicol University accounts — sign up with your @bicol-u.edu.ph email." (Enforcement is a database trigger; the UI copy is the friendly layer. Sign-in has no domain check so the allowlisted admin can log in.)

### 2. Chat (`/`) — the product
**Shell:** top bar (mobile only: hamburger + wordmark + account avatar); sidebar/drawer: "New chat" primary button, session list (title + relative time, active item `--primary` tinted), account menu at bottom (name, role badge, theme toggle, admin link when role=admin, sign out).

**Welcome state** (no messages): serif heading "Ask about any BUCS policy", one-line subtitle, 4 suggested-prompt buttons (2×2 grid ≥640px, stacked below) that submit immediately: grading policy, leave of absence, attendance requirements, academic appeal. If **no documents are indexed yet** (or no API key configured), replace prompts with an informative empty state; if the viewer is the admin, it deep-links to `/admin/documents` / `/admin/settings`.

**Conversation:** user messages as right-aligned `--surface-2` bubbles; assistant answers as full-column markdown (no bubble) with a small avatar dot. While streaming: pulsing caret, composer disabled, stop button replaces send. Auto-scroll pins to bottom only while the user is already at the bottom (don't fight upward scrolling); a "jump to latest" pill appears otherwise.

**Citations:** answer text carries `[1]`-style markers; below the message a wrap row of chips (`1 · Student Handbook`). Activating a chip expands one quote block inline: the exact snippet, source title + chunk, close affordance. Keyboard: chips are buttons, Enter/Space toggles, `aria-expanded` set.

**Feedback row** (completed assistant messages only): 👍 records instantly with a subtle confirmation; 👎 opens dialog/bottom-sheet with "What was wrong or missing?" textarea → submit. After either, row collapses to "Thanks for the feedback".

**Escalation:** persistent ghost "Ask a human" in the header; additionally an inline card auto-appears under any assistant answer with zero citations ("This wasn't found in the policy documents — send it to an administrator?"). Dialog pre-fills the question; on submit, toast "Sent — an admin will follow up".

**Degraded states (free-tier honest):** rate-limit hit → inline system notice "Free-tier limit reached — retrying in Ns" with countdown, auto-retry once; provider key invalid/missing → notice telling users the assistant is offline (admins see a fix link); network drop mid-stream → partial answer kept, "Connection lost — retry" button.

### 3. Session history
Sidebar lists the user's sessions newest-first. Selecting loads full history including stored citations (chips work identically on historical messages). New sessions appear after first exchange, titled from the first user message. Skeleton rows while loading. Delete via hover/long-press menu with confirm.

### 4. Admin (`/admin/*`) — role-gated
Left nav (desktop) / horizontal scrollable tabs (<768px): **Dashboard, Documents, AI Settings, Feedback, Escalations.** "← Back to chat" always visible.

- **Dashboard:** plain stat list (users, chats 7d, messages 7d, 👍/👎 ratio, open escalations, indexed docs) as a simple two-column definition list — no KPI hero cards. Below: setup checklist card shown until complete (① API key saved ✓ ② first document indexed ✓).
- **Documents:** upload panel (file input `.pdf,.txt,.md`, title, audience checkboxes) + documents table (title, status pill, chunks, audience, date, actions: re-index / delete). Table → stacked cards <640px. Status transitions live-update (poll or refresh on action).
- **AI Settings — the "one key" page:** provider section: a single masked API-key field (write-only; shows `••••` + last-4 + verified badge once saved), model name select with sensible default, "Save & verify" button that performs a live 1-token test call and shows ✓ "Key verified — chat is live" or the provider's error verbatim. Below, retrieval settings: chunk size, overlap, match threshold, match count with inline help and DB-mirrored bounds; note that chunking changes apply on next index.
- **Feedback:** table (rating, comment, message excerpt expandable, user, date), filter by rating.
- **Escalations:** open-first table; "Resolve" expands an inline resolution textarea (no modal) → status flips.

## Responsive matrix

| Breakpoint | Shell | Chat column | Admin |
|---|---|---|---|
| <640px | Drawer, sticky top bar, safe-area composer | Full width, 16px gutters | Tabs + stacked cards |
| 640–1023px | Drawer (768–1023: icon rail acceptable) | Centered, max 46rem | Tabs + tables |
| ≥1024px | Persistent 288px sidebar | Centered, max 46rem | Left nav + tables |

Keyboard/mobile specifics: `viewport-fit=cover`, `interactive-widget=resizes-content`, composer never hidden by the on-screen keyboard; drawer traps focus and closes on Escape/overlay tap; all targets ≥44px.

## Error handling (UI contract)

Every async surface has explicit loading / empty / error / success states (see DESIGN.md components). SSE errors map to a persistent inline notice with retry — never a silent dead spinner. Form errors are inline per-field; destructive actions (delete document/session) confirm inline or via `<dialog>`, never `window.confirm`.

## Out of scope (YAGNI)

PWA install, offline cache, avatars/uploads, per-message sharing links, multi-language UI, email notifications, analytics beyond the dashboard counts.
