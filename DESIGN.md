---
name: Deep Midnight Commerce
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c6c5d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8f8fa0'
  outline-variant: '#454655'
  surface-tint: '#bec2ff'
  primary: '#bec2ff'
  on-primary: '#000da4'
  primary-container: '#5865f2'
  on-primary-container: '#fffdff'
  inverse-primary: '#3f4cda'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00865c'
  on-tertiary-container: '#fafff9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bec2ff'
  on-primary-fixed: '#000569'
  on-primary-fixed-variant: '#222fc2'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  price-tag:
    fontFamily: Hanken Grotesk
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 22px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin: 32px
  card-padding: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system establishes a sophisticated, "deep-sea" dark mode aesthetic that prioritizes focus, clarity, and premium value. Moving beyond simple educational resource sharing into a transactional environment, the brand personality is authoritative yet welcoming—blending the structured reliability of a technical dashboard with the fluid, high-end feel of modern e-commerce.

The visual style is **Corporate Modern with Tonal Layering**. It utilizes a palette of deep navies and subtle slate blues to create a multi-dimensional workspace. Information is organized into distinct containers that use slight value shifts rather than heavy borders or shadows to denote hierarchy, ensuring that high-contrast elements (like price tags and primary actions) command immediate attention.

## Colors

The color palette is anchored by a very deep navy background, providing a low-strain environment for extended browsing. 

- **Primary:** A vibrant, saturated blue used for critical calls-to-action like "Add to Cart" and active navigation states.
- **Secondary:** A lighter, ethereal cyan used for accents, secondary buttons, and highlighting current selections.
- **Tertiary:** An emerald green reserved specifically for positive financial indicators, successful checkout messages, and "In Stock" badges.
- **Surface Tones:** A progression of slate blues (`#1E293B` to `#334155`) is used to layer cards and sidebars against the base background.

## Typography

The typography system balances the precision of developer tools with the readability of a retail platform. 

**Hanken Grotesk** serves as the primary display face, offering a sharp, contemporary look for titles and product names. **Inter** handles the heavy lifting for body text and descriptions due to its exceptional legibility in dark environments. For technical metadata, semester identifiers, and SKU numbers, **JetBrains Mono** is used to provide a structured, "data-rich" feel that connects back to the system's technical roots.

Large headings should use tight letter-spacing to maintain a compact, impactful look. Labels and metadata should always be set in uppercase with slight tracking to ensure they don't "vibrate" against dark backgrounds.

## Layout & Spacing

The system uses a **12-column fluid grid** for the main content area, with a fixed-width sidebar (260px) for navigation. 

- **Desktop:** 32px outer margins with 24px gutters. Content cards generally span 3 columns in a 4-item row.
- **Tablet:** 24px margins with 16px gutters. Cards reflow to 2 columns.
- **Mobile:** 16px margins. Sidebar transforms into a bottom bar or a hamburger drawer.

Spacing follows a strict 4px baseline. Vertical rhythm is maintained through "stacks"—standardized margins between elements within a container (e.g., 8px between a title and its subtitle, 16px between description text and the "Add to Cart" button).

## Elevation & Depth

Depth is conveyed through **Tonal Layering** rather than traditional drop shadows. In a dark UI, shadows are often invisible or look muddy; instead, this system uses "Elevation through Luminance."

1.  **Level 0 (Background):** The darkest color (`#0B0E14`), used for the canvas.
2.  **Level 1 (Sidebars/Nav):** Slightly lighter navy, creating a vertical anchor.
3.  **Level 2 (Cards/Containers):** The primary surface (`#1E293B`).
4.  **Level 3 (Popovers/Tooltips):** The lightest surface with a subtle 1px border of `#334155` to define the edge.

When an element is hovered, its background luminance increases by 5-10%, creating a "lift" effect without needing physical shadows.

## Shapes

The design system employs a **Rounded** shape language to soften the "tech-heavy" navy palette and make the commerce experience feel more accessible.

- **Cards & Primary Containers:** Use a 1rem (`rounded-lg`) corner radius.
- **Buttons & Inputs:** Use a 0.5rem base radius.
- **Badges/Chips:** Use a fully circular (pill) radius for status indicators and price tags to differentiate them from interactive buttons.
- **Icons:** Should be enclosed in rounded-square containers when used as primary navigation touchpoints.

## Components

### Buttons
- **Primary (Add to Cart):** Solid `#5865F2` background with white text. On hover, the background brightens. Use a prominent icon (e.g., a plus sign or cart) alongside the text.
- **Secondary (View Details):** A ghost-style button with a 1px border of `#334155` and `#38BDF8` text.

### Price Tags
Set in **Hanken Grotesk Bold**. For e-commerce items, display prices in a high-contrast white or light cyan. If a discount is applied, show the original price in a strike-through style using a muted slate gray.

### Cards
Cards are the primary unit of the layout. They feature a solid `#1E293B` background. Content is divided into a top "Visual Area" (for product thumbnails or semester icons) and a bottom "Action Area" containing the title, price, and CTA.

### Shopping Cart Interface
The cart should appear as a "Slide-over" panel from the right. It uses the Level 3 elevation (lightest surface). Line items should be separated by subtle horizontal dividers (`#334155`). The "Checkout" button remains fixed at the bottom of the panel with a backdrop-blur effect on its container to suggest transparency and depth.

### Input Fields
Search bars and text inputs use a darker, inset background (`#0B0E14`) with a 1px border that glows Primary Blue when focused. Use JetBrains Mono for placeholder text to maintain the technical aesthetic.