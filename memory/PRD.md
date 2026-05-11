# Bissal — Problem Solver Hub (PRD)

## Original Problem Statement
Build "Problem Solver Hub" (branded **Bissal**) — multi-module website tackling real-world issues across sustainability, finance, education, health, and community. Premium classic typewriter aesthetic, white background, black text, minimalist.

## Tech Stack (revised from Node/SQLite → platform standard)
- Backend: FastAPI (Python) + MongoDB (motor)
- Frontend: React 19 + Tailwind + Shadcn UI + framer-motion + recharts
- Auth: Emergent-managed Google OAuth (cookie-based, /api/auth/session)
- LLM: Claude Sonnet 4.5 via Emergent Universal Key (motivational quotes)
- Live currency: open.er-api.com (free, no key)
- Exports: reportlab (PDF) + openpyxl (Excel)

## Implemented Modules (6 — v1) + Community Health Q&A (v1.1)
1. **Waste Exchange** — list/search recyclables, contact field, material filter
2. **Water Tracker** — daily logs, chart with conservation benchmark, .xlsx export
3. **Tax Helper** — income/expense ledger, auto P&L + estimated tax, PDF + Excel export
4. **Currency + Logistics** — live rates + customs %, transport, fees → landed cost
5. **Mental Journal** — mood log + Claude-typed motivational quote w/ typewriter animation, PDF export
   - **NEW · Community Health Q&A** — public posts with anonymous toggle, threaded suggestions/comments, comment count, cascade-delete
6. **Skill Swap** — listings, search, ratings (asterisks) + reviews

## Liveliness upgrades (v1.1)
- Animated typewriter SVG hero illustration (keys press, ribbon dashes scroll)
- Ticker tape under top bar with rotating workshop news
- Vermillion ink-stamp badges on every module card (FRESH/DAILY/OFFICIAL/LIVE/QUIET/OPEN)
- Marker-underline accent on headings, red drop-quote pull quote
- Soft lift-hover (drop shadow + translate) on cards & CTAs
- Community Health Q&A callout band on landing
- Print-in fade animation on first paint

## User Personas
- Micro-business owner (Tax)
- Student / commuter (Journal, Water)
- Community resident (Skill Swap, Waste)
- Cross-border trader (Currency)

## Design
- Editorial print archetype: white background, black 1px borders, no rounded corners
- Primary font: Courier Prime
- Display font: Special Elite (typewriter)
- Accent: Vermillion red `#FF3333`
- Typewriter stagger animation on Claude AI quotes

## Deferred (P1/P2)
- Revision Table Generator (notes → flashcards)
- Exam Law/Finance Amendment Tracker
- Affordable Medicine Finder
- Neighborhood Weather Hub
- Messaging / chat between users on waste/skill listings

## Next Tasks
- Run end-to-end testing
- Optionally seed sample data
- Optionally add the 4 deferred modules in a v2 release

Created: 2026-02-11
