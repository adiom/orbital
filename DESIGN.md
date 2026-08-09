---
version: "alpha"
name: Orbital
description: >-
  A calm, premium living-knowledge universe. Conversations become knowledge.
  Every idea floats as a living cell on a warm, quiet canvas; motion is slow,
  elevation is soft, and nothing reads as a diagram, board, or file explorer.
colors:
  primary: "#18181B"
  on-primary: "#FAFAFA"
  canvas: "#FBFAF8"
  surface: "#FFFFFF"
  glass: "rgba(255,255,255,0.72)"
  glass-sheet: "rgba(255,255,255,0.55)"
  ink: "#0A0A0C"
  ink-strong: "#171717"
  ink-muted: "#737373"
  ink-faint: "#A3A3A3"
  accent: "#A78BFA"
  danger: "#DC2626"
  life-born: "#38BDF8"
  life-alive: "#34D399"
  life-settled: "#A78BFA"
  life-quiet: "#D6D3D1"
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.04em
  card-title:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.01em
  body:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  card-description:
    fontFamily: Geist
    fontSize: 11.5px
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  label-form:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.4
  label-caps-brand:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.34em
  label-state:
    fontFamily: Geist
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.2em
  meta-activity:
    fontFamily: Geist
    fontSize: 10.5px
    fontWeight: 400
    lineHeight: 1
  stats:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1
  chip:
    fontFamily: Geist
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1
  initials:
    fontFamily: Geist
    fontSize: 9px
    fontWeight: 500
    lineHeight: 1
  mono:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 24px
  node: 28px
  glow: 36px
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  node-pad-x: 17px
  node-pad-y: 15px
  link-distance: 280px
  node-radius-force: 165px
components:
  shell-canvas:
    backgroundColor: "{colors.canvas}"
  card-node:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
    rounded: "{rounded.node}"
    padding: "{spacing.md}"
  card-node-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-strong}"
  button-ghost:
    backgroundColor: "rgba(255,255,255,0.72)"
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 32px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: 16px
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 36px
    padding: 16px
  action-control:
    backgroundColor: "rgba(255,255,255,0.70)"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    size: 36px
  chip-info:
    backgroundColor: "rgba(255,255,255,0.70)"
    textColor: "{colors.ink-muted}"
    typography: "{typography.chip}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  avatar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.initials}"
    rounded: "{rounded.full}"
    size: 24px
  create-fab:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 56px
  density-bar:
    backgroundColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    height: 4px
  stats-bar:
    backgroundColor: "{colors.glass-sheet}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.stats}"
    rounded: "{rounded.full}"
    padding: 8px 16px
  lifecycle-label:
    textColor: "{colors.ink-faint}"
    typography: "{typography.label-state}"
  empty-state-orb:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    size: 12px
  life-indicator-born:
    backgroundColor: "{colors.life-born}"
    rounded: "{rounded.full}"
    size: 10px
  life-indicator-alive:
    backgroundColor: "{colors.life-alive}"
    rounded: "{rounded.full}"
    size: 10px
  life-indicator-settled:
    backgroundColor: "{colors.life-settled}"
    rounded: "{rounded.full}"
    size: 10px
  life-indicator-quiet:
    backgroundColor: "{colors.life-quiet}"
    rounded: "{rounded.full}"
    size: 10px
---

# Orbital — Living Knowledge Universe

Orbital is where conversations become knowledge. The canvas is a quiet, organic
constellation of living thoughts. Nothing here should feel like a chat app, a
file explorer, a board, a UML graph, a mind map, or a diagram editor — and the
UI copy never forces a fixed noun onto the user's object. Internally the code
still uses historical names (`orbit`, `Sfera`, routes like `/orbit/[id]`), but
the public UI speaks in verbs and states: `Создать...`, `Открыть`,
`Продолжить`, `Развить`, `Настройки`, `Удалить`, `живет`, `созревает`, `тихо`.

## Overview

Calm, premium, organic. The canvas is warm off-white with large areas of
intentional negative space. The living map reads as a constellation of floating
glass cards connected by soft, glowing threads. Depth is soft and light-based —
never mechanical. Motion is slow, elegant, and meaningful; nothing snaps,
jumps, or scans.

Reference originals: Apple Freeform, Figma canvas, Arc Browser, Linear, Notion,
and modern macOS UI. Explicitly avoid: Miro, draw.io, XMind, UML, org charts,
Trello, file explorers.

Two rules animate every screen:

1. **Feel like walking through ideas, not browsing folders** — exploration over
   navigation.
2. **Don't fake data** — life signals (state, density, glow, participants, AI
   insights) render only when real data exists.

## Colors

A warm off-white foundation, deep neutral inks, and a single signature accent.
All hues beside the accent come from the **life states** — the four moods a
thought passes through: born, alive, settled, quiet.

### Canvas and surface

- **Canvas (`#FBFAF8`)** — the living-map background. Softer and more organic
  than pure white.
- **Surface (`#FFFFFF`)** — pure white only on form cards, popovers, and the
  mobile create sheet.
- **Glass (`rgba(255,255,255,0.72)`)** — frosted node-card fill over the
  canvas; always paired with `backdrop-blur-2xl`.
- **Glass sheet (`rgba(255,255,255,0.55–0.60)`)** — floating chrome: stats bar,
  archive, toolbar. Slightly more transparent so control chrome recedes.

### Ink (text)

| Role | Token | Value | Tailwind |
|---|---|---|---|
| Core text | `ink` | `#0A0A0C` | `text-foreground` |
| Node titles | `ink-strong` | `#171717` | `text-neutral-950` |
| Node description | `ink-muted` | `#737373` | `text-neutral-500` |
| Labels, icons | `ink-faint` | `#A3A3A3` | `text-neutral-400` |
| On primary buttons | `on-primary` | `#FAFAFA` | `text-primary-foreground` |

### Linear versus borders

- **Border (`#E4E4E7`)**: real edges on forms and inputs.
- **Border glass (`rgba(255,255,255,0.70)`)**: `ring-1 ring-white/70` hairline
  glow around floating chrome and nodes — edges feel like light, not lines.

### Accent

**Accent (`#A78BFA`)**: soft violet is the only interaction hue outside the life
scale. Used for: selected node ring, focus rings, the empty-state orb, archive
dots, AI insight badges. Glow `rgba(168,85,247,0.20)`.

### Life states (the living DNA)

Each card reports its mood through a dot, a glow, and a label. These hues carry
most of the color perception on the map:

| State (token) | Label (RU) | Dot | Glow |
|---|---|---|---|
| `life-born` | `родилось` | `#38BDF8` sky-400 | `rgba(96,165,250,0.22)` |
| `life-alive` | `живет` | `#34D399` emerald-400 | `rgba(16,185,129,0.24)` |
| `life-settled` | `созревает` | `#A78BFA` violet-400 | `rgba(168,85,247,0.20)` |
| `life-quiet` | `тихо` | `#D6D3D1` stone-300 | `rgba(148,163,184,0.16)` |

Rule: **never** use an outside hue for a life signal. Multiplicity is
expressed through dot + glow + label (10px caps, `+0.2em`).

### Danger & signals

- **Danger (`#DC2626`, red-600)**: only for destructive confirmation and the
  delete hover accent.
- **Density gradient**: `linear-gradient(to right, #38BDF8, #34D399, #A78BFA)`
  — the density bar shows growing life in the same hue family.

### Ambient canvas finish

The map mounts on a faint, fixed gradient: radial violet `rgba(168,85,247,0.10)`
top-left, radial blue `rgba(59,130,246,0.09)` top-right, radial emerald
`rgba(16,185,129,0.07)` center-bottom; a white film `rgba(255,255,255,0.55)`
is applied above all three to keep contrast even. This is `#FBFAF8` warm, not
gray.

## Typography

Two Google Geist faces, set in Russian. Type is small, regular-to-medium, with
slightly negative tracking on headlines. No bold stacks, no weight above 600.

| Token | Use | Size | Weight | Tracking/notes |
|---|---|---|---|---|
| `headline-lg` | empty-state heading | 30px | 500 | `-0.04em` |
| `card-title` | node title | 16px | 500 | `-0.01em` |
| `body` | default text | 16px | 400 | `line-height 1.6` |
| `card-description` | node description | 11.5px | 400 | 2-line clamp, `leading-snug` |
| `button` | buttons | 14px | 500 | — |
| `label-form` | form labels | 14px | 600 | — |
| `label-caps-brand` | `ORBITAL` wordmark, empty-state eyebrow | 11px | 500 | `+0.34em`, uppercase |
| `label-state` | life-state labels | 10px | 500 | `+0.2em`, uppercase |
| `meta-activity` | «ожило недавно» etc. | 10.5px | 400 | `leading-none` |
| `stats` | stats bar | 11px | 400 | — |
| `chip` | badges/pills | 10px | 400 | — |
| `initials` | participant initials | 9px | 500 | — |
| `mono` | code / data values | 12px | 400 | Geist Mono |

Always clamp node title and description with `line-clamp-2`. Never exceed two
font weights per screen.

## Layout

Desktop is a **custom compact-force constellation**, not a DAG or org chart:

- Nodes mostly pinned by persisted coordinates; unsaved ones settle around the
  pinned via `computeForceLayout` (radius 165px, link distance 280px,
  charge −1500).
- A tiny organic jitter (`sin(i×1.73)×8px`, `cos(i×1.17)×6px`) keeps the layout
  from looking engineered.
- `NODE_WIDTH` 280, `NODE_HEIGHT` 210 as the sim reference box; cards render
  at a scale driven by their data score (`getScale`).
- Everything floats over a full-viewport canvas; **no scroll chrome aside** —
  panning, pinch, Meta-zoom only.

### Mobile

Mobile is a vertical scroll, not a canvas:

- **Stories row** of young thoughts (horizontal, snap-mandatory, dots
  indicator).
- **Продолжения zone**: parents with forks, their fork-children indented below.
- A floating **create FAB** (`56px`, `rounded-full`, `primary` ink) anchored at
  bottom-center above the safe-area inset.

The primary create CTA is always an enigmatic **`Создать...`**, never
`New Orbit` / `Create Orbit` / `Orbit Settings`.

### Spacing & rhythm

Spacing scale is **8px, with a 4px half-step**: `xs 4 · sm 8 · md 16 · lg 24 ·
xl 32`. Node internals use `mt-4`/`mt-5` blocks; chrome floats use `gap-2`.
Radii come from the `rounded` scale; `full` (9999px) only for pills/fabs/stats­
pill.

## Elevation & Depth

Depth = **tonal layers + soft light**, never hard material shadows.

- Node shadow: `0 24px 80px rgba(15,23,42,0.10)` resting; `0 30px 100px
  rgba(15,23,42,0.14)` on hover. Selected adds a violet glow layer.
- Floating chrome (toolbar/stats/search): `0 14–18px 40–60px rgba(15,23,42,
  0.07–0.10)`.
- Create sheet: `0 -10px 40px rgba(15,23,42,0.12)`.
- Empty-state orb: `0 0 40px rgba(168,85,247,0.45)`.

Depth is *radial and warm*: the ink has a blue-violet cast, never pure black.

## Shapes

- **Node card**: `28px` radius, outer glow `36px`.
- **Floating chrome**: `rounded-full` pills (search, control, arrows).
- **Forms/inputs**: `rounded-xl` (12px), 2px hairline.
- **Mobile sheet**: `rounded-t-[24px]`.
- **FABs, avatars, tooltips**: full circles.
- Radius tokens: `xs 4 · sm(buttons) 6 · md-lg variation · node 28 · glow 36 ·
  full`.

## Components

### Node card (the living cell)

The atomic object of the living map — a **frosted glass card scaled by life**.

- Width `min(230×scale)`; min-height `148×scale`; padding `15×scale` (y) /
  `17×scale` (x); radius `28px`; background `glass`; `backdrop-blur-2xl`.
- Reading order: title → description (2-line clamp) → density bar → meta row:
  activity label, chips (`суть есть`, `растет`, `личное`), participant initials.
- Top highlight: an `inset-x-5 top-0` 1px white gradient hairline.
- Interactive (back): handle presses open, drag repositions. `cursor-grab`,
  `active:cursor-grabbing`.
- **Selected**: `ring-2 ring-accent` + violet sheen.
- **Compact** (small scores): a minimal `160px` variant with just the dot+title
  and a branch count.
- **Quiet/abstained**: rendered at `opacity-35` (dimmed) or as a transparent
  placeholder for never-planted nodes.

### Floating chrome (desktop)

- **Search/control bar**: centered pill `top-4`, `bg-white/72`,
  `border-white/70`, `backdrop-blur-2xl`,
  `shadow-[0_18px_60px_rgba(15,23,42,0.08)]`.
- **Stats bar**: `bottom-6 left-6`, pill, `bg-white/55`, text `stats`/`ink`.
  e.g. `4 · 5 связей · 30 сообщений · 2 в архиве`.
- **Toolbar** (top-right): three `36px` circle buttons
  (`bg-white/70`, `border-white/70`) — Собрать заново, Сбросить раскладку,
  Показать всё.
- **Archive**: pill toggle + expanding popover of `bg-white/60` entries.
- All chrome: `pointer-events-auto` so the map's own pan/scroll stays comfortable.

### Buttons

CVA variants; `size` variants `sm/default/lg/icon`. Radii:

- default: `bg-primary text-on-primary`, hover `bg-neutral-800`.
- destructive: `bg-danger`.
- ghost/outline: transparent → `bg-neutral-100`.
- link: text-only.
- Height scale: 32/36/40; padding 12/16/24 horizontal.
- Focus ring: `ring-2 ring-ring/50`.

### Empty universe

When there are no objects: one 12px breathing orb with violet glow, an
eyebrow (`label-caps-brand`), the poetic invite, and (mobile) the FAB:

> **Пустая вселенная.**  
> Создайте то, что еще не имеет формы.

### Create sheet (mobile)

- Background `surface`, top radius `24px`, handle (1×40px `neutral-200` pill)
  centered.
- Input `rounded-2xl`, border `neutral-200`, fills `neutral-50` on focus.
- Submit pill `Создать` — ink when enabled, `neutral-100/neutral-400` disabled,
  with a `ArrowUp` icon.

### Participant avatars

- `24×24px` circles, `bg-primary`, `text-white` `9px` initials, `border-white`.
- Overlap `-space-x-2` (stacked).

## Do's and Don'ts

- **Do** speak in verbs and states: `Создать...`, `Открыть`, `Продолжить`,
  `живет`, `созревает`. Avoid nouns only; never `Create Orbit`, `New Orbit`,
  `All Orbits`, `Orbit Settings`, `Forked from:` → use `Продолжение:`.
- **Do** let the map breathe; a full-screen, partially empty constellation is
  the product.
- **Do** respect `prefers-reduced-motion`: kill ambient loops, springs, and
  long transitions.
- **Do** show life signals only from real data — no fabricated density,
  participants, or insights.
- **Do** WCAG AA (4.5:1) for normal text.
- **Don't** build diagram-app aesthetics: no Miro/board/UML tree
  overlays, no arrows with ends, no left-panel file list.
- **Don't** use more than two font weights per screen.
- **Don't** add drop shadows that read as harsh elevation; keep warmth via
  translucent fill + soft glow.
- **Don't** force a public noun onto the user's object — let it remain
  "the idea that is living".