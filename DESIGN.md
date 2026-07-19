# Design

Visual system for BUCS PolicyPulse. Register: **product** (design serves the task). Color strategy: **Restrained** — pure surfaces, one deep-blue primary carrying identity, accents ≤10% of any screen.

## Theme

Light and dark, both first-class. Default follows `prefers-color-scheme`; a toggle in the account menu persists the override (class `dark` on `<html>`, stored in `localStorage`). The mood: a well-run registrar's office — quiet, precise, verifiable. Identity lives in the deep blue and the serif wordmark, never in tinted surfaces.

## Color

All tokens OKLCH, defined as CSS custom properties in `src/app/globals.css` and mapped into Tailwind via `@theme`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page background (pure, no tint) |
| `--surface` | `oklch(0.97 0.003 255)` | `oklch(0.185 0.005 255)` | Sidebar, panels, cards, composer |
| `--surface-2` | `oklch(0.94 0.005 255)` | `oklch(0.23 0.006 255)` | Hover states, table stripes, code blocks |
| `--ink` | `oklch(0.21 0.02 258)` | `oklch(0.95 0.005 255)` | Body text (≥7:1 vs bg) |
| `--muted` | `oklch(0.50 0.015 258)` | `oklch(0.72 0.01 255)` | Secondary text (≥4.5:1 vs bg) |
| `--primary` | `oklch(0.42 0.09 258)` | `oklch(0.68 0.10 258)` | Primary actions, active nav, links, focus ring |
| `--primary-ink` | `oklch(1 0 0)` | `oklch(0.15 0.02 258)` | Text on primary fills |
| `--accent` | `oklch(0.55 0.11 80)` | `oklch(0.78 0.11 85)` | Citation refs, "verified" moments only |
| `--accent-subtle` | `oklch(0.95 0.03 85)` | `oklch(0.26 0.04 85)` | Citation chip / snippet backgrounds (ink text on top) |
| `--danger` | `oklch(0.50 0.15 25)` | `oklch(0.70 0.14 25)` | Destructive actions, errors, failed status |
| `--success` | `oklch(0.52 0.10 150)` | `oklch(0.72 0.11 150)` | Indexed status, key-verified state |
| `--border` | `oklch(0.89 0.004 255)` | `oklch(0.30 0.005 255)` | 1px hairlines everywhere |

Rules: text on `--primary` fills is always `--primary-ink` (white in light mode). `--accent` is reserved for the citation system and success-of-verification moments — it never decorates. Status pills use the semantic colors at subtle-background + strong-text pairs, not full saturation fills.

## Typography

- **UI/body:** `Inter` (variable, `next/font`), fallback `system-ui`. Everything interactive — buttons, labels, tables, chat text.
- **Display:** `Source Serif 4` — wordmark ("PolicyPulse"), the welcome-screen heading, and login heading only. Never in buttons, labels, or answer text.
- Fixed rem scale, ratio ≈1.2: 0.75 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.25rem. Body 1rem/1.6. Chat answer column max-width 46rem (~70ch).
- Markdown answers: h2/h3 map to 1.125/1rem semibold, lists get breathing room, tables scroll horizontally inside the bubble (`overflow-x: auto`), code uses `--surface-2`.
- `text-wrap: balance` on headings; `letter-spacing: -0.02em` on the serif display sizes only.

## Spacing, Radius, Elevation

- 4px base grid; component padding steps 8/12/16/24; section gaps 24/32/48.
- Radius: 8px inputs & buttons, 12px cards/bubbles/dialogs (max), full-pill for chips and status pills.
- Elevation: borders first. Shadows only on floating layers (drawer, dialogs, menus): `0 4px 8px oklch(0 0 0 / 0.08)` max — never border + wide shadow on the same element.
- Z-scale (semantic): `--z-dropdown: 20`, `--z-sticky: 30`, `--z-drawer: 40`, `--z-overlay: 50`, `--z-dialog: 60`, `--z-toast: 70`.

## Layout

- **App shell:** desktop ≥1024px — persistent 288px sidebar (`--surface`) + centered chat column (max 46rem) on `--bg`; sidebar collapses to icon rail at 768–1023px; <768px — full-width chat, sidebar becomes a slide-over drawer (overlay `oklch(0 0 0 / 0.4)`) behind a hamburger in a sticky top bar.
- **Composer:** sticky bottom, `--surface` card with 1px border; grows to 6 lines then scrolls; safe-area padding (`env(safe-area-inset-bottom)`) on mobile; `interactive-widget=resizes-content` viewport meta so the keyboard never covers it.
- **Admin:** same shell vocabulary — left nav (Dashboard / Documents / AI Settings / Feedback / Escalations) becomes a horizontal scrollable tab bar <768px. Tables become stacked definition-list cards <640px.
- **Auth:** single centered card on `--bg`, serif heading, nothing else.

## Components

Shared vocabulary (every interactive element ships default/hover/focus/active/disabled/loading states):

- **Button:** primary (`--primary` fill), secondary (border + `--ink`), ghost (text only), danger. Height 40px (44px touch), radius 8px, focus ring `2px --primary` offset 2px.
- **Message bubble:** user — `--surface-2`, radius 12px, right-aligned, max 85%; assistant — no bubble, full-column markdown on `--bg` with a 20px avatar dot. Streaming shows a 1ch pulsing caret after the last character.
- **Citation chip:** pill, `--accent-subtle` bg, `--ink` text, leading ref number in `--accent`; tap/click/Enter expands a quote block (left-padded, `--accent-subtle` bg, source line in `--muted`) inline below the message; one open at a time; `aria-expanded`.
- **Feedback row:** ghost icon buttons (👍/👎, 20px icons, 44px targets) that appear under a completed assistant message; 👎 opens a bottom-sheet (<640px) / dialog (≥640px) with one textarea.
- **Status pill:** subtle bg + strong text — `indexed` success, `processing` primary + spinner, `failed` danger, `pending` muted.
- **Skeletons** for session list and admin tables; **empty states** teach (“Upload your first policy PDF — the chat can’t answer until at least one document is indexed”), never bare “no data”.
- **Toast:** bottom center mobile / bottom right desktop, `--ink` on `--surface`, auto-dismiss 4s, action slot.
- **Dialogs/drawer:** native `<dialog>` element (escapes stacking contexts), backdrop blur none, fade+8px-rise 200ms.

## Motion

150–250ms, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint). Motion conveys state only: drawer slide, dialog rise, chip expand (grid-template-rows trick, no height animation), caret pulse, status-pill spinner. No page-load choreography, no scroll reveals. `@media (prefers-reduced-motion: reduce)`: all transitions ≤1ms, caret becomes a static ▍, smooth-scroll becomes instant jump.

## Voice & Copy

Registrar-plain: "Grades are final 14 days after posting [1]." Buttons are verbs ("Upload document", "Save key", "Ask a human"). Errors say what happened and what to do ("The AI provider rejected the key — check it in AI Settings"). Rate-limit states are honest ("Free-tier limit reached — retrying in 20s"). No exclamation marks, no "Oops!", no sparkle emoji.
