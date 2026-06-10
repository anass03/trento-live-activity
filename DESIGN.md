---
name: Trento Live Activity
description: A premium, cinematic smart-city console for Trento — the live map is the product, glass and restrained glow are the lens.
colors:
  bg-deep: "#030b18"
  bg-deep-2: "#061227"
  text-primary: "#f4f8ff"
  text-secondary: "rgba(222, 232, 247, 0.78)"
  text-muted: "rgba(186, 201, 224, 0.52)"
  text-faint: "rgba(160, 178, 205, 0.38)"
  cyan: "#38bdf8"
  teal: "#2dd4bf"
  violet: "#a78bfa"
  magenta: "#f472b6"
  green: "#34d399"
  amber: "#fbbf24"
  orange: "#fb923c"
  red: "#f87171"
  glass-1: "rgba(18, 32, 56, 0.74)"
  glass-2: "rgba(9, 18, 35, 0.62)"
  border-soft: "rgba(255, 255, 255, 0.10)"
  day-bg-deep: "#eef5f0"
  day-accent: "#2f8f5e"
  day-text-primary: "#14251b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "9.5px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  sm: "12px"
  md: "16px"
  lg: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.cyan}"
    textColor: "#03130f"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "44px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.cyan}"
    textColor: "#03130f"
    rounded: "{rounded.sm}"
  icon-btn:
    backgroundColor: "{colors.glass-1}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    height: "44px"
    width: "44px"
  nav-item-active:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  widget:
    backgroundColor: "{colors.glass-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "14px 18px"
  chip:
    backgroundColor: "{colors.glass-2}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
    typography: "{typography.label}"
  search-bar:
    backgroundColor: "{colors.glass-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 18px"
---

# Design System: Trento Live Activity

## 1. Overview

**Creative North Star: "The Alpine Console"**

Trento Live Activity is a civic command surface that shifts with the daylight over the Dolomites. By night it is a deep-navy observatory — the lit city floating below, widgets reading out parking, crowding, and activity in real time. By day it becomes Alpine daylight: a pale green-tinted canvas with the same map and panels recomposed for an outdoor-bright environment. **The dual-theme system is the signature**, not an afterthought; every token has a night value and a day override, and the whole scene cross-fades between them.

The map is the product. Everything else is blurred glass lifted above it — panels, navigation, search — there to inform and then get out of the way. Atmosphere (glass, depth, a restrained accent glow) exists strictly to separate layers and direct the eye to live data, never as ornament. The energy is real: it comes from the city breathing through accurate, moving data, not from things that animate for show. The voice is confident and precise, the polish in service of a public service that has to be *trusted*.

This system explicitly rejects three things. It is **not a generic government / PA portal** — no dated bureaucratic form-soup or default system widgets. It is **not a crypto / gamer dark dashboard** — the neon is restrained and meaningful, gated behind a `--glow` token tuned to 0.4, never garish neon-on-black HUD theatrics. And it is **not a flat startup SaaS template** — no hero-metric blocks, no interchangeable icon-card grids.

**Key Characteristics:**
- Map-first: floating glass overlays, never a chrome-heavy app shell.
- Dual day/night theming as a first-class system, cross-faded over ~550ms.
- A neon **category** palette (8 hues) used for meaning — crowding, category, status — not decoration.
- Restrained luminosity: every glow is multiplied by `--glow` (0.4) so the system never tips into hype.
- Two type voices only: a humanist sans for everything readable, a mono for labels and data.

## 2. Colors

A deep, cool, night-first palette where a single accent and a meaning-bearing neon category set ride over near-black navy glass; a full daylight override recomposes the same roles in Alpine green.

### Primary
- **Signal Cyan** (`#38bdf8`): The night accent. Primary actions, the active navigation pill, focus rings, current selection, and live-state indicators. Used for *action and attention only*, never as a fill for decoration.
- **Alpine Green** (`#2f8f5e`): The day-theme accent (`[data-theme="day"]`). Same semantic role as Signal Cyan, swapped in when the console moves to daylight. Carries the civic, outdoor, alpine identity.

### Secondary — The Category Set
A neon vocabulary where each hue *means* something (activity category, crowding level, status). Never mix them for visual variety.
- **Teal** (`#2dd4bf`): Calm / "tranquilla" states, low crowding.
- **Violet** (`#a78bfa`): Culture category, secondary highlights, gradient partner to the accent.
- **Magenta** (`#f472b6`): Peak activity ("molto attiva"), live/now markers.
- **Lime Green** (`#34d399`): Success, availability, "free" parking.
- **Amber** (`#fbbf24`): Moderate crowding, caution.
- **Orange** (`#fb923c`): High activity, warning.
- **Coral Red** (`#f87171`): Full, error, danger.

### Neutral
- **Ice White** (`#f4f8ff`): Primary text on night surfaces. Day inverts to **Forest Ink** (`#14251b`).
- **Text Secondary** (`rgba(222,232,247,0.78)`): Sub-labels, supporting copy. **Verify against glass tints, not just the base bg** — must clear 4.5:1.
- **Text Muted** (`rgba(186,201,224,0.52)`) / **Text Faint** (`rgba(160,178,205,0.38)`): Meta, timestamps, kbd hints. Faint is decorative-grade only — never body text.
- **Deep Navy** (`#030b18`) / **Navy 2** (`#061227`): The base scene; the night canvas behind the map. Day → **Mist** (`#eef5f0`).
- **Glass 1** (`rgba(18,32,56,0.74)`) / **Glass 2** (`rgba(9,18,35,0.62)`): Panel fills, always blurred. Day → translucent whites (`rgba(255,255,255,0.62)`).
- **Border Soft** (`rgba(255,255,255,0.10)`): Hairline panel edges. The glass highlight (`inset 0 1px 0`) does as much separating work as the border.

### Named Rules
**The Restrained Glow Rule.** Every accent glow is multiplied by the `--glow` token (default `0.4`). Glow communicates live energy and active state; it is never at full strength and never decorative. If a panel glows at rest with nothing happening, it is wrong.

**The Meaning-Not-Mood Rule.** A category hue is chosen because the data *is* that category or crowding level — never because the layout "needed some color there." Color is data.

## 3. Typography

**Display / Body Font:** Plus Jakarta Sans (with `system-ui, -apple-system, sans-serif`)
**Label / Mono / Data Font:** IBM Plex Mono (with `ui-monospace, "SF Mono", Menlo, monospace`)

**Character:** One humanist-geometric sans carries every readable element across weights 400–800; a single mono handles labels, eyebrows, data readouts, and kbd hints. The pairing contrasts on the proportional-vs-monospace axis — the only legitimate way these two should ever differ. Plus Jakarta's tight negative tracking on headings reads premium and modern; Plex Mono's wide tracking on micro-labels reads instrument-panel.

### Hierarchy
- **Display** (800, 26px, 1.05, `-0.02em`): Page and detail-cover titles. The ceiling of the system — this is product UI, so it stays a fixed rem-ish size, never a fluid clamp.
- **Headline** (700, 19px, 1.15, `-0.02em`): Brand name, section headers, modal titles.
- **Title** (700, 13.5px, 1.25): Widget headers, list-row primary text, button labels.
- **Body** (500, 13.5px, 1.5): Descriptions and prose. Cap prose at 65–75ch; dense data rows may run tighter.
- **Label** (Mono, 600, 9.5–11px, `0.10–0.18em`, often uppercase): Eyebrows, marker tags, status pills, kbd, data units. The mono + wide tracking is the "instrument readout" texture.

### Named Rules
**The Two-Voice Rule.** Exactly two families: Plus Jakarta Sans for anything you read, IBM Plex Mono for anything you measure (labels, data, units, codes). Never introduce a third family, and never set body copy in the mono.

## 4. Elevation

Floating glass over the living map. Panels are not flat — they are blurred glass surfaces (`backdrop-filter: blur(18px) saturate(135%)`) lifted above the map with a deep ambient shadow, a top inner highlight that fakes a lit glass edge, and a restrained accent glow that intensifies on interaction. Depth is how the system says "this overlay sits above the city." A semantic z-index ladder keeps it ordered: map (1) → overlay/grade (2) → vignette (3) → widgets (5) → header (10).

### Shadow Vocabulary
- **Widget rest** (`box-shadow: 0 24px 56px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10)`): Default float for glass panels. The inset highlight is mandatory — it's the lit top edge of the glass.
- **Widget hover** (`var(--widget-shadow-hover), 0 0 30px [accent×0.20×glow], inset 0 1px 0 [strong]`): Lifts `translateY(-3px)`, border shifts toward accent, a soft accent halo blooms, and a cursor-tracking radial highlight (`::before`) fades in.
- **Bar / controls** (`0 22px 50px rgba(0,0,0,0.40)` / `0 18px 44px rgba(0,0,0,0.42)`): Header and floating control clusters.
- **Active control glow** (`0 0 16–18px [accent×0.45–0.50×glow]`): Active nav pill, toggled map controls. The only glow allowed at rest, and only on a genuinely active element.

### Named Rules
**The Lit-Glass Rule.** Every glass panel carries both a deep ambient drop shadow *and* an `inset 0 1px 0` top highlight. One without the other looks like a 2014 flat card or an unlit slab. If a panel has no inner top highlight, it isn't finished.

## 5. Components

### Buttons
- **Shape:** Pill (`999px`) for header/icon controls; soft-rounded (`11–12px`) for full-width form CTAs.
- **Primary (form CTA):** Accent→violet gradient (`linear-gradient(135deg, var(--accent), color-mix(accent 60%, var(--violet)))`), near-black ink (`#03130f`) for contrast, 44px tall, soft accent shadow + inset top highlight. Hover lifts `translateY(-1px)` and deepens the accent shadow.
- **Icon button:** 44px circle, glass fill, soft border; hover shifts border toward accent (`color-mix(accent 42%)`) and lifts 1px. Carries notification badge (magenta dot with glow) when relevant.
- **Map control (`mc-btn`):** Glass-on-glass; toggled "on" state gets the accent gradient fill + 16px accent glow.

### Chips / Pills
- **Style:** Glass fill (`--chip-fill`), soft hairline border, mono micro-label, pill radius. Filter and status variants.
- **State:** Unselected reads muted; selected/active gets the accent gradient fill + `inset 0 0 0 1px` accent ring + restrained glow (same treatment as the active nav pill).

### Cards / Containers (Widgets)
- **Corner Style:** Large radius (`22px`, `--radius-lg`).
- **Background:** Glass gradient (`linear-gradient(150deg, var(--glass-1), var(--glass-2))`) with `backdrop-filter: blur(18px) saturate(135%)`.
- **Shadow Strategy:** See Elevation — ambient drop + inset top highlight at rest; accent halo + cursor-tracking radial on hover.
- **Border:** 1px `--border-soft`; shifts toward accent on hover.
- **Internal Padding:** `14px 18px` (`--space-md`/`lg`).
- **Empty state:** A dedicated `.widget-empty` panel — muted, centered, teaching copy — never a bare "nothing here."

### Inputs / Fields
- **Style:** Pill search bar, glass fill, soft border, mono `kbd` hint chip inside. Form inputs use the soft-rounded radius.
- **Focus:** Border shifts toward accent (`color-mix(accent 42%)`); the search bar also widens (`230px → 270px`). No harsh outline — the accent border *is* the focus ring, so ensure it stays ≥3:1.
- **Disabled / Error:** Error borrows Coral Red, success Lime Green (see `revamp-action-btn` variants).

### Navigation
- **Style:** A segmented glass pill bar. Items are mono-adjacent sans, muted at rest.
- **States:** Hover → secondary text + subtle fill; **active** → accent gradient fill, `inset` accent ring, and a restrained accent glow. Only one item glows at a time.

### Signature Component — The Theme Toggle & The Living Map
- **Theme toggle:** A 70×36 pill with a gradient thumb that slides 34px on a gentle overshoot curve (`cubic-bezier(.4,1.4,.5,1)`) between sun and moon. It drives the entire `[data-theme]` token swap and the ~550ms scene cross-fade. This is the one place a spring curve is sanctioned.
- **The map:** The product centerpiece. Custom palette tokens (`--map-*`) for water, parks, blocks, roads, labels, each with full day/night values; markers are accent-glowing dots with mono tags and hover tips. Treat the map's color tokens as part of the system, not an afterthought.

## 6. Do's and Don'ts

### Do:
- **Do** keep the map the hero. Overlays float; they never become a chrome-heavy app shell that buries the city.
- **Do** gate every glow through `--glow` (0.4). Active/hover states earn glow; surfaces at rest do not.
- **Do** give every glass panel both a deep ambient shadow and an `inset 0 1px 0` top highlight (The Lit-Glass Rule).
- **Do** use the neon category hues for *meaning* — crowding, category, status — pairing color with a label or icon so it survives color blindness.
- **Do** maintain both a night value and a day override for every new token. The dual-theme system is the signature.
- **Do** honor `prefers-reduced-motion` — the global rule kills animations and clamps transitions; the ~550ms scene fade and the toggle spring must degrade to instant.
- **Do** verify text contrast against the *glass tint*, not the base navy: body ≥4.5:1, large/UI ≥3:1. `--text-faint` is decorative-grade, never body.

### Don't:
- **Don't** let it look like a generic government / PA portal — no dated bureaucratic form-soup, default system widgets, or visual apology.
- **Don't** let it become a crypto / gamer dark dashboard — no garish neon-on-black, no full-strength glow, no chart-everywhere HUD theatrics. The `--glow` ceiling exists to prevent exactly this.
- **Don't** ship a flat startup SaaS template — no hero-metric blocks (big number + small label + gradient), no identical icon + heading + text card grids.
- **Don't** introduce a third font family, and never set body copy in IBM Plex Mono (The Two-Voice Rule).
- **Don't** use a category hue as decoration. If it isn't carrying data meaning, it doesn't belong (The Meaning-Not-Mood Rule).
- **Don't** use a tiny uppercase tracked eyebrow above every section, or `01 / 02 / 03` numbered scaffolding, as default. The mono micro-label is for data and status, not reflexive section kickers.
- **Don't** use `border-left`/`border-right` >1px as a colored accent stripe, gradient text (`background-clip: text`), or decorative glassmorphism beyond the established panel system.
