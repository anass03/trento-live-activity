---
target: Activities / Events flow
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-06-10T15-00-27Z
slug: frontend-new-src-pages-activitiespage-tsx
---
# Design Critique — Activities / Events Flow

**Target:** frontend-new/src/pages/{ActivitiesPage, EventsPage, ActivityDetailPage, EventDetailPage}.tsx + activity-redesign.css
**Method:** source + CSS review. No live browser evidence (node_modules wiped → dev server down). Rendered-pixel issues, real contrast ratios, and overflow/clipping are predicted from code, not observed.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Full-page "Caricamento…" text (no skeletons); joining gives no confirmation; likes are cosmetic-only |
| 2 | Match System / Real World | 3 | Italian copy natural, but three verbs for one act (Partecipa/Prenota/Ottieni Biglietto); trending/live partly fake |
| 3 | User Control and Freedom | 3 | Good back/cancel/reset; Esc doesn't close the sort menu |
| 4 | Consistency and Standards | 2 | Two sibling browse pages with different IA; redundant tabs vs filters; dead .drawer CSS |
| 5 | Error Prevention | 2 | Optimistic like/save with no rollback; dead Share button |
| 6 | Recognition Rather Than Recall | 3 | Filters/tabs visible, icons labeled, current sort shown |
| 7 | Flexibility and Efficiency | 2 | Rich filters but no keyboard shortcuts; sort menu not keyboard-operable |
| 8 | Aesthetic and Minimalist Design | 2 | Beautiful glass craft, but very dense and padded with decorative/fake widgets |
| 9 | Error Recovery | 2 | Detail pages recover well; list pages render fetch failure identically to no results |
| 10 | Help and Documentation | 1 | No contextual help anywhere |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

Visual craft is genuinely strong (real token system, restrained --glow, lit-glass elevation, coherent neon category coding). The slop is one layer deeper: the data is theater.

- Fabricated trust layer: ACT_AUTHORS/ACT_TRUST are hardcoded fictional people; every backend activity maps to author g or o on a single ruolo check (ActivitiesPage.tsx:507). The "Autori affidabili" widget and per-card trust badges are invented. For a civic-trust product this is the most damaging thing here; contradicts the "Earn public trust" principle.
- Fake calendar: MiniCalendar (EventsPage.tsx:36) hardcoded to "Maggio 2026", days 13-19, static dots on 16/17/18. Today is 2026-06-10 — wrong month, painted-on data, doesn't filter the feed.
- Decorative-energy tells: LiveNow equalizer bars + "Live ora" pulse exist for vibe; brushes the crypto/gamer-dashboard anti-reference DESIGN.md bans.
- Hero eyebrow: .hero-eyebrow mono uppercase letter-spacing 0.16em — the tracked-eyebrow trope DESIGN.md lists under Don'ts.
- Identical placeholder-art cards: every .act-card/.post uses a flat category gradient + one big ghost icon as media; structurally identical, no real imagery.

Deterministic scan: detect.mjs returned [] (exit 0) across all four files, but it is HTML/CSS-oriented and these are .tsx — treat as no signal, not a pass.

Visual overlays: Not available. Dev server couldn't start (node_modules wiped). No user-visible overlay for this run.

## Overall Impression

A well-built shell wrapped around half-real data. The chrome is premium; the substance wobbles. Biggest opportunity isn't visual — it's making the interface tell the truth: kill or wire-up the fabricated trust/author/calendar layers, and resolve the participation model so "join" means one thing, feels like one thing, and confirms it happened. Second: it's too much — a citizen asking "what should I do today?" gets a three-column control panel.

## What's Working

1. The token & elevation system is real and disciplined (glass, --glow-gated accents, lit-glass shadows, consistent radii) — faithful to DESIGN.md.
2. Detail-page error states are good (ActivityDetailPage.tsx:109 — danger pill + recovery button). Not applied to list pages.
3. Empty states occasionally teach: "Nessuna attività pubblicata → Crea la prima attività" (ActivitiesPage.tsx:470).

## Priority Issues

[P1] The trust/author/calendar data is fabricated. A civic platform selling trustworthy real-time info cannot show invented reliability badges and a wrong-month calendar. Fix: wire author/trust/calendar to real backend fields or remove until data exists. Command: /impeccable harden

[P1] Predicted contrast failures on muted/faint text. WCAG 2.1 AA commitment. --text-faint (0.38) and --text-muted (0.52) used for 11-12px text over translucent glass almost certainly fall below 4.5:1. Unverified — needs live measurement. Fix: bump small-text colors toward ink. Command: /impeccable audit

[P1] Participation is inconsistent and unconfirmed. Card CTA "Partecipa" only opens detail; activity detail "Prenota Attività"; event detail "Ottieni Biglietto Ingresso." Three verbs, no success confirmation (silent re-fetch). Fix: one verb, one affordance, clear success state. Command: /impeccable clarify then /impeccable harden

[P2] Cognitive overload on browse pages. Hero + 5 tabs + 7 sorts + ~18 filter controls + 5-widget right rail at once; tabs (Verificate/In crescita/Salvate) duplicate filter chips. Fix: collapse redundant overlap, progressive disclosure, thin the rail. Command: /impeccable distill

[P2] Fetch errors masquerade as empty results; dead Share button. Failed getActivities/getEvents caught, logged, shown as "Nessuna attività…"; Share (EventsPage.tsx:182) does nothing. Fix: distinct error+retry; implement or remove Share. Command: /impeccable harden

## Persona Red Flags

Casey (Mobile): touch targets under 44px (.pf-chip 32, .act-tab/.diff-pill 38, .act-save 32); 3-col collapses to long scroll with hero+filters above results; no state persistence; CTA mid-card not thumb-reachable.

Sam (A11y): sort dropdown is divs+global click listener — no aria-expanded, role=listbox, Esc, or arrow keys; tabs not a real tablist; predicted AA contrast failures; capacity encoded partly by color alone.

Riley (Stress): optimistic join/save only console.error on failure, showing false success; backend outage looks like an empty feed; trending/live/trust numbers reconcile with nothing real.

Marco (project persona — resident deciding what to do tonight): opens Events expecting tonight, sees a calendar stuck on May with past-date dots; wants to commit fast but meets sort menu + 5 tabs + unverifiable trust badge; never gets a confirmed "you're in."

## Minor Observations

- Dead .drawer/.drawer-* system in activity-redesign.css:340-413 (~75 lines unused; detail is a full page).
- Sort menu is position:absolute inside a possibly overflow:auto column — watch for clipping (needs live check).
- Composer avatar hardcoded "MR" fallback.
- Two browse pages, two filter IAs (Activities one widget; Events MiniCalendar+QuickFilters split).

## Questions to Consider

- What would this look like if every number on screen were real? Which widgets survive that test?
- The hero asks a calm question but the page answers with a control panel. What if the answer were three confident suggestions instead of a filter rig?
- If "join" is the one thing that matters, what would a version look like where joining is impossible to miss and impossible to doubt?
