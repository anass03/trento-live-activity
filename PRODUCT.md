# Product

## Register

product

## Users

Trento Live Activity serves several distinct actors, all interacting with the same real-time view of the city:

- **Unauthenticated citizens** — read-only visitors browsing public map data (parking, crowding, public events) before deciding to sign up.
- **Registered citizens** — the primary audience. On the move or at home, they explore the live map, filter activities and events, join or propose spontaneous activities, and tune personalised notifications around their interests.
- **Certified entities** (sports clubs, cultural institutions, venues) — publish verified events carrying a certification badge.
- **Comune di Trento administrators** — authenticate via SPID; live in the analytics dashboard, monitoring urban-activity trends and exporting PDF/CSV statistical reports.
- **System administrators** — authenticate with 2FA; manage POIs, user accounts, and DSA-compliant content moderation.

Context of use spans glance-and-go mobile checks (is there parking near the Duomo right now?) to focused desktop sessions (a Comune analyst building a report). The UI is Italian-language first.

## Product Purpose

A civic-tech platform that makes the live state of Trento legible and actionable: real-time IoT data (parking, crowding) and social activity layered onto an interactive map, plus the tooling for citizens to participate and for the municipality to govern. Success is a citizen trusting the map enough to act on it, and a Comune analyst getting a defensible report out without friction. The product earns trust by being accurate, fast, and unmistakably a serious public service — not a tech demo.

## Brand Personality

**Premium · cinematic · futuristic.** The interface leans into its glassmorphic, neon-accented smart-city aesthetic: an atmospheric dark canvas with the map as the living centerpiece, day/night theming, and restrained glow. Voice is confident and precise, never hype. The polish is in service of legibility and trust — the city should feel *alive* and *current*, like looking at Trento through a well-made instrument, not a game HUD. Energy comes from real-time motion and accurate data, not decoration.

## Anti-references

- **Generic government / PA portal.** No dated, bureaucratic, cluttered Italian public-administration look. Avoid form-soup, default system widgets, and visual apology.
- **Crypto / gamer dark dashboard.** No garish neon-on-black, gratuitous glow, chart-everywhere hype, or HUD theatrics. The neon is restrained and meaningful.
- **Flat startup SaaS template.** No interchangeable Bootstrap/Tailwind-default landing aesthetic, hero-metric blocks, or identical icon-card grids.

## Design Principles

1. **The map is the product.** Everything else is an overlay that earns its place on top of the live city. Widgets float, inform, and get out of the way; they never bury the map.
2. **Atmosphere serves legibility.** Glass, glow, and depth exist to separate layers and direct attention — never as ornament. If an effect doesn't help the user read the city faster, it's cut.
3. **Real-time over decorative.** Motion and color convey live state (crowding, availability, activity), not flourish. The interface feels alive because the data is, not because things animate for show.
4. **Earn public trust.** This is a civic service. Accuracy, clarity, and restraint signal seriousness; certification badges, honest empty/error states, and consistent affordances matter more than delight.
5. **One vocabulary, every role.** Citizen, entity, Comune, and admin surfaces share one component and color system. Density and tooling scale up for admins; the visual language never fragments.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**: body text ≥4.5:1 and large/UI text ≥3:1 against the dark surfaces and glass panels (verify glass tints, not just the base bg), full keyboard navigation, visible focus states, and labeled controls. Honor `prefers-reduced-motion` on every animation with a crossfade or instant fallback — including the real-time map and widget transitions. Category color coding must not be the only signal (pair color with label/icon, mindful of color blindness). As a public service handling DSA moderation and GDPR erasure, treat inclusive, comprehensible Italian copy as part of accessibility.
