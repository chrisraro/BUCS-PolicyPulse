# Product

## Register

product

## Users

BUCS students, faculty, and one admin (the project owner). Access is exclusive to Bicol University accounts — sign-up requires a `@bicol-u.edu.ph` email (the owner's admin account enters via an explicit allowlist). Students and faculty arrive with a concrete question mid-task — "when is the add/drop deadline?", "how do I file an appeal?" — often on a phone, between classes, and want a trustworthy answer in under a minute. The admin maintains the knowledge base, pastes the LLM API key, and reviews feedback/escalations from a laptop. This is a personal project running entirely on free tiers; nobody is paid to babysit it, so every surface must be self-explanatory.

## Product Purpose

An institutional policy assistant: ask a question in plain language, get a grounded answer quoted from the actual uploaded policy documents, with citations you can verify without leaving the chat. Success = a user trusts the answer enough to act on it, or is cleanly routed to a human when the documents don't cover it. The admin can go from "fresh deploy" to "working chat" by doing exactly two things: paste a free-tier LLM API key, upload a PDF.

## Brand Personality

Official, calm, verifiable. It should feel like a well-run registrar's office, not a chatbot toy: unhurried typography, quiet surfaces, answers that show their sources. Warmth comes from clarity and the serif wordmark, never from decoration.

## Anti-references

- Generic AI-chat gloss: purple gradients, glassmorphism, glowing orbs, "✨ AI magic" copy.
- Cream/parchment "academia aesthetic" backgrounds — surfaces stay pure white / near-black; the deep blue carries the identity.
- Enterprise dashboard bloat: KPI hero cards with gradient accents, dense chrome the single admin doesn't need.
- Anything that hides the sources — answers without visible citations are a failure state, not a style choice.

## Design Principles

1. **The answer is the interface.** Everything on the chat screen serves reading the answer and verifying it; chrome collapses out of the way, especially on phones.
2. **Trust is shown, not claimed.** Citations are first-class UI, one tap from the exact quoted passage; "I don't know" routes to a human instead of hedging.
3. **Two-step admin.** Any capability that isn't reachable within two clicks of the admin home doesn't ship.
4. **Free-tier honest.** The UI communicates rate limits and cold starts plainly (queued, retrying, paused project) instead of pretending to be infinite SaaS.
5. **One vocabulary.** Same button, same form control, same feedback pattern on every screen — chat and admin share one component set.

## Accessibility & Inclusion

WCAG 2.1 AA: body text ≥ 4.5:1 in both themes, visible focus rings on every interactive element, full keyboard operability (composer, chips, drawer, dialogs), `prefers-reduced-motion` honored (streaming falls back to plain text append), touch targets ≥ 44px, screen-reader announcements for streaming state ("answer in progress / complete").
