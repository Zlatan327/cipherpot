# CipherPot Design System & Dual-Source Synthesis Spec

This document establishes the binding design tokens, architectural rules, and iconography synthesis for CipherPot by unifying two reference systems:
- **Primary UI & Design System Source (URL A):** [Framo by Nestory](https://www.framer.com/marketplace/templates/framo/) — High-contrast dark cinematic editorial system.
- **Iconography & Arrangement Source (URL B):** [Nostalgia Computer by Real Mehedi](https://framer.com/projects/Nostalgia-Computer-copy--0o5dSt92yYXbSX5kZDmK-ijSeJ?id=dabc1563-3610-4d60-acfd-d81f71869e42&reason=web-signup&node=augiA20Il) — Retro OS dock, squircle badges, tactile action tiles, and spatial icon anchors.

---

## Part 1: Audit of URL A (Framo — UI & Design System)

URL A provides **100%** of the color tokens, typography scales, border radii, shadows, surface elevations, section architecture, grid layouts, and motion dynamics.

### 1. Color Palette Tokens

| Token Name | Hex / Value | Semantic Role & Application |
|---|---|---|
| `--bg-app` | `#080A08` | Deepest obsidian canvas background (underlying page background) |
| `--bg-surface` | `#0F1310` | Primary container surface (cards, major section wrappers) |
| `--bg-surface-raised` | `#151B17` | Elevated containers, interactive cards, inspector sidebars |
| `--bg-surface-subtle` | `#0B0E0C` | Recessed backgrounds, input fields, code blocks, secondary wells |
| `--bg-surface-hover` | `#1C241E` | Hover highlight state for cards and list rows |
| `--bg-surface-active` | `#222D25` | Pressed / selected state for interactive components |
| `--bg-glass` | `rgba(15, 19, 16, 0.82)` | Glassmorphic floating bars (dock, sticky headers) with 16px blur |
| `--border-subtle` | `#1B241D` | Low-contrast interior dividers, table grid lines |
| `--border-default` | `#263329` | Standard component perimeter borders, card frames |
| `--border-strong` | `#3A4E3F` | Highlighted cards, focused inputs, active container edges |
| `--border-accent` | `#D9FF55` | High-voltage accent border for active round, winning solves |
| `--border-highlight` | `rgba(255, 255, 255, 0.08)` | 1px top specular highlight edge for 3D depth |
| `--text-primary` | `#F4F7F1` | Primary headings, candidate titles, active pot readout |
| `--text-secondary` | `#C4D1C2` | Body prose, secondary labels, feed questions |
| `--text-muted` | `#8F9F8E` | Meta attributes (era, origin, timestamps, player counts) |
| `--text-dim` | `#5C6B5B` | Ruled-out cards, disabled actions, footnote watermarks |
| `--lime` | `#D9FF55` | Brand accent: Primary CTA, active badges, live indicators |
| `--lime-dark` | `#B5DB30` | Button active/pressed states, deep contrast badges |
| `--lime-dim` | `#1D2817` | Low-opacity badge pill background (`rgba(217, 255, 85, 0.12)`) |
| `--lime-glow` | `rgba(217, 255, 85, 0.18)` | Ambient soft drop-shadow aura for hero pot and winning state |
| `--color-success` | `#4ADE80` | "Yes" AI answers, verified cryptographic attestation |
| `--color-success-bg` | `rgba(74, 222, 128, 0.10)` | Yes answer pill background, verified badge fill |
| `--color-danger` | `#F87171` | "No" AI answers, eliminated candidate cross-offs, errors |
| `--color-danger-bg` | `rgba(248, 113, 113, 0.10)` | No answer pill background |
| `--color-warning` | `#FACC15` | "Unclear" answers, timeout warnings, quota countdown |
| `--color-warning-bg` | `rgba(250, 204, 21, 0.10)` | Unclear badge background |

### 2. Typography Hierarchy

Fonts imported:
- **Headings & Display:** `Space Grotesk`, sans-serif (weights: 500, 600, 700)
- **Body & UI Controls:** `DM Sans` / `Inter`, sans-serif (weights: 400, 500, 600)
- **Technical & Telemetry:** `DM Mono`, monospace (weights: 400, 500)

| Style Level | Font Family | Size (px / rem) | Line Height | Tracking | Weight | Case / Transform |
|---|---|---|---|---|---|---|
| **Display Hero** | Space Grotesk | `clamp(2.25rem, 5vw, 3.75rem)` | 1.05 | `-0.035em` | 700 | Normal |
| **Section Title (H2)** | Space Grotesk | `1.75rem` (28px) | 1.15 | `-0.025em` | 600 | Normal |
| **Card Header (H3)** | Space Grotesk | `1.25rem` (20px) | 1.25 | `-0.02em` | 600 | Normal |
| **Kicker / Super-tag** | Space Grotesk | `0.75rem` (12px) | 1.0 | `+0.08em` | 600 | UPPERCASE |
| **Body Large** | DM Sans | `1.05rem` (16.8px) | 1.55 | `-0.01em` | 400 | Normal |
| **Body Regular** | DM Sans | `0.875rem` (14px) | 1.50 | `0` | 400 / 500 | Normal |
| **UI Caption / Label** | DM Sans | `0.75rem` (12px) | 1.40 | `+0.01em` | 500 | Normal |
| **Telemetry Big (Pot)** | DM Mono | `2.0rem` (32px) | 1.10 | `-0.02em` | 500 | Tabular |
| **Telemetry Medium** | DM Mono | `0.9375rem` (15px) | 1.25 | `0` | 500 | Tabular |
| **Telemetry Pill** | DM Mono | `0.75rem` (12px) | 1.00 | `+0.02em` | 400 | Tabular |

### 3. Container Widths & Responsive Breakpoints

- **Max Layout Width:** `1360px` centered with `24px` horizontal margin (`16px` on mobile).
- **Narrow Content Container (Modals & Inspectors):** `480px` – `640px`.
- **Breakpoints:**
  - `Desktop Wide:` `≥ 1280px` (Full 2-column 65/35 grid + sticky sidebar).
  - `Desktop / Laptop:` `1024px – 1279px` (Stacked or compacted sidebars).
  - `Tablet:` `768px – 1023px` (Single column with collapsible panels).
  - `Mobile:` `≤ 767px` (Full-width cards, 2-column candidate board, bottom dock).
  - `Mobile Narrow:` `375px` (Tight padding `12px`, 44px minimum touch targets).

### 4. Surface Styles & Elevation Architecture

```
Layer 0: Canvas (#080A08)
  └── Layer 1: Section Container / Bento Surface (#0F1310 + 1px #263329)
        └── Layer 2: Elevated Interactive Card (#151B17 + 1px #263329)
              ├── Top Specular Edge: inset 0 1px 0 rgba(255, 255, 255, 0.08)
              ├── Ambient Shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.6)
              └── Layer 3: Floating Dock / Popover Modal (#0F1310 @ 85% + blur(16px))
```

### 5. Border Radii Standards

- **Outer Bento Cards & Large Panels:** `18px` (`rounded-2xl`)
- **Inner Content Cards & Board Tiles:** `12px` (`rounded-xl`)
- **Buttons, Inputs & Action Triggers:** `10px` (`rounded-lg`)
- **Control Tabs & Mini Badges:** `6px` – `8px` (`rounded-md`)
- **Status Pills & Dock Containers:** `9999px` (`rounded-full`)

### 6. Motion Timing & Interaction Curves

- **Hover Transition:** `all 200ms cubic-bezier(0.16, 1, 0.3, 1)` (Framer spring response).
- **Modal / Drawer Slide-in:** `320ms cubic-bezier(0.22, 1, 0.36, 1)`.
- **Card Transform on Hover:** `transform: translateY(-2px); border-color: var(--border-strong)`.
- **Active Click Compression:** `transform: scale(0.985); transition: transform 80ms ease-out`.

---

## Part 2: Audit of URL B (Nostalgia Computer — Icon Rules)

URL B provides **strictly the icon geometry, container treatments, and spatial arrangement patterns**. All retro colors, CRT raster scanlines, and 90s typography from URL B are ignored.

### 1. Icon Geometry & Stroke Metrics

- **Icon Style:** Refined linear outline icons (compatible with Lucide React / Feather icons).
- **Stroke Width:** Exact **1.75px** (desktop) to **2.0px** (mobile touch clarity).
- **Caps & Corners:**
  - `stroke-linecap="round"`
  - `stroke-linejoin="round"`
- **Fill Treatment:**
  - Default: Pure stroke outline with `fill="none"`.
  - Active / Highlighted State: Subtle duotone fill using `12%` opacity of the stroke color (e.g., lime fill `rgba(217, 255, 85, 0.12)` with solid lime stroke).

### 2. Container Treatments (From URL B)

URL B organizes icons into four distinct architectural treatments:

1. **The Tactical Squircle Tile (Desktop Dock & Mode Switches):**
   - Shape: Squircle / rounded rectangle (`12px` radius on 44x44px; `10px` radius on 36x36px).
   - Interior Icon: Exactly **50%** of container size (22px icon inside 44px tile; 18px icon inside 36px tile).
   - Inset Depth: Subtle top-left specular bevel (`inset 1px 1px 0 rgba(255,255,255,0.08)`) with recessed dark floor.
2. **The Status Pill Badge (Inline Header & Live Telemetry):**
   - Shape: Fully rounded pill (`rounded-full`, height `26px` to `28px`).
   - Padding: `4px` top/bottom, `10px` left/right.
   - Icon: `14px` stroke icon preceding text label with `6px` gap.
3. **The Bento Card Floating Anchor (Section & Feature Highlights):**
   - Shape: Rounded rectangle (`10px` radius, 36x36px).
   - Placement: Floating top-left or top-right of cards with `16px` margin from card border.
   - Icon: `18px` icon centered inside with subtle radial background glow.
4. **Window Control Action Badges (Modal & Sheet Controls):**
   - Shape: Compact square (`28x28px`, `6px` radius).
   - Placement: Flush right inside modal header strips.
   - Icon: `14px` icon centered.

### 3. Spatial Alignment & Padding Ratios

- **Icon-to-Container Ratio:** Always **1:2** to **1:1.8** (Icon occupies 50% to 55% of container width/height).
- **Inline Title Alignment:** Center-aligned on the cap-height of adjacent typography with an exact `8px` or `10px` right gap.
- **Floating Dock Arrangement:** Equidistant horizontal spacing (`8px` gap between dock tiles) housed within a centered bottom dock bar elevated with a `32px` bottom offset.

---

## Part 3: Synthesis Spec (Re-Skinning URL B with URL A)

This mapping explicitly dictates how URL B's icon structures are re-skinned using URL A's color palette, typography, and borders:

| Icon Container Pattern (URL B) | Geometry & Size | Re-Skinned Surface (URL A) | Re-Skinned Border & Radius (URL A) | Re-Skinned Icon Stroke & Fill (URL A) |
|---|---|---|---|---|
| **Floating Control Dock Tile** | `44 × 44 px` squircle | `var(--bg-surface)` (`#0F1310`), hover: `var(--bg-surface-hover)` (`#1C241E`) | Radius: `12px`. Border: `1px solid var(--border-default)` (`#263329`). Top bevel: `inset 0 1px 0 rgba(255,255,255,0.08)`. | Stroke: `var(--text-secondary)` (`#C4D1C2`). Active: `var(--lime)` (`#D9FF55`) with `12%` lime fill. |
| **Active Mode / Tab Indicator** | `36 × 36 px` or inline tab | Active: `var(--lime-dim)` (`#1D2817`). Inactive: transparent. | Radius: `8px`. Active border: `1px solid var(--border-accent)` (`#D9FF55`). | Active stroke: `var(--lime)` (`#D9FF55`). Inactive stroke: `var(--text-muted)` (`#8F9F8E`). |
| **Bento Card Feature Anchor** | `38 × 38 px` squircle | `var(--bg-surface-raised)` (`#151B17`) | Radius: `10px`. Border: `1px solid var(--border-subtle)` (`#1B241D`). | Stroke: `var(--text-primary)` (`#F4F7F1`). Hover stroke: `var(--lime)`. |
| **Live Telemetry Status Pill** | Height `26px`, auto width | `var(--lime-dim)` (`rgba(217, 255, 85, 0.10)`) | Radius: `9999px`. Border: `1px solid rgba(217, 255, 85, 0.25)`. | `14px` icon in `var(--lime)` with pulsating status dot. |
| **Question Verdict Badge** | Height `28px`, px `10px` | Yes: `var(--color-success-bg)`<br>No: `var(--color-danger-bg)`<br>Unclear: `var(--color-warning-bg)` | Radius: `6px`. Border: `1px solid` matching semantic border token. | Yes: `Check` (stroke `#4ADE80`)<br>No: `X` (stroke `#F87171`)<br>Unclear: `HelpCircle` (stroke `#FACC15`). |
| **Candidate Board Tile Badges** | `22 × 22 px` mini-tag | `var(--bg-surface-subtle)` (`#0B0E0C`) | Radius: `4px`. Border: `1px solid var(--border-subtle)` (`#1B241D`). | `12px` icon in `var(--text-muted)` representing era/category. |
| **Window Action / Close Badge** | `28 × 28 px` square | `var(--bg-surface-raised)` (`#151B17`), hover: `var(--bg-surface-hover)` | Radius: `6px`. Border: `1px solid var(--border-default)`. | `14px` icon in `var(--text-muted)`, hover: `var(--text-primary)`. |

---

## Part 4: CipherPot Component Architecture (Framo Sequential Sections + Nostalgia Dock)

```
+---------------------------------------------------------------------------------------------------+
| TopBar: Logo Mark (Obsidian Squircle + Lime Cipher Key) | Status Pills | Wallet Action Button     |
+---------------------------------------------------------------------------------------------------+
| Hero Section (Framo Editorial Typography):                                                        |
|   - Live Pot Telemetry Card (Space Grotesk + DM Mono 32px + Lime Glow)                            |
|   - Round Lifecycle Timer & Active Season Statistics                                              |
+---------------------------------------------------------------------------------------------------+
| Main Arena Bento Grid (65% / 35% Asymmetric Split):                                               |
|   Column A (65%):                                  | Column B (35% Sticky Sidebar):               |
|     - Deduction Command Center                     |   - Live Question & Answer Feed              |
|       (Assisted / Pure Skill Mode Switches)        |     (Structured Yes/No Badges + Rule-Outs)   |
|     - Question Submission & Shannon Suggestions    |   - Active Autonomous Agents Panel           |
|     - 64-Candidate Interactive Board Grid          |   - TEE Attestation & Commitment Proof       |
|       (Eras, Origins, Real-Time Cross-Outs)        |                                              |
+---------------------------------------------------------------------------------------------------+
| Floating Retro-Nostalgia Control Dock (Fixed Bottom-Center, Glassmorphic Obsidian Bar):          |
|   [The Round] [The Board (64)] [Ask / Shannon] [Leaderboard] [Archives] [How to Play]           |
+---------------------------------------------------------------------------------------------------+
```

---

## Part 5: Verification & Phase 1 Sign-Off Checkpoints

- [x] **URL A Colors**: 100% extracted with exact hex codes and surface hierarchy.
- [x] **URL A Typography**: Font scales, line-heights, letter-spacing, and font pairings documented.
- [x] **URL A Radii & Shadows**: Exact radii (6px, 10px, 12px, 18px, 9999px) and diffuse ambient drop-shadows mapped.
- [x] **URL B Geometry**: Outline stroke weight (1.75px - 2.0px), rounded caps/joins, 50% container ratio specified.
- [x] **URL B Container Synthesis**: Squircle tiles, bento card floating anchors, and status pills completely re-skinned with URL A tokens.
- [x] **No UI components written**: Strictly completed Phase 1 planning awaiting user approval.
