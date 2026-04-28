---
name: SOLGINE
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#cec2d8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#978da1'
  outline-variant: '#4c4355'
  surface-tint: '#d8b9ff'
  primary: '#d8b9ff'
  on-primary: '#450086'
  primary-container: '#9945ff'
  on-primary-container: '#ffffff'
  inverse-primary: '#7f21e5'
  secondary: '#a0ffc3'
  on-secondary: '#00391f'
  secondary-container: '#00ec91'
  on-secondary-container: '#00653b'
  tertiary: '#75d1ff'
  on-tertiary: '#003548'
  tertiary-container: '#0080a9'
  on-tertiary-container: '#ffffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eddcff'
  primary-fixed-dim: '#d8b9ff'
  on-primary-fixed: '#290055'
  on-primary-fixed-variant: '#6300bb'
  secondary-fixed: '#56ffa8'
  secondary-fixed-dim: '#00e38b'
  on-secondary-fixed: '#002110'
  on-secondary-fixed-variant: '#00522f'
  tertiary-fixed: '#c2e8ff'
  tertiary-fixed-dim: '#75d1ff'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#004d67'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  stat-value:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  section-gap: 64px
  element-gap: 16px
  gutter: 24px
---

## Brand & Style

This design system is engineered to evoke the high-octane performance of AAA gaming engines while maintaining the sophisticated precision of high-finance Web3 architecture. The brand personality is "Elite Technical," targeting developers and players who demand a seamless, immersive experience within the Solana ecosystem. 

The visual style utilizes a **Futuristic Glassmorphism** approach. It leans heavily into deep, layered z-axis depth created through transparency and refraction, rather than traditional shadows. The emotional response should be one of stability and high-fidelity power—positioning the product as the literal "engine" behind digital economies. The interface remains spacious and uncluttered, allowing neon accents to serve as functional waypoints in a dark, high-contrast environment.

## Colors

The palette is anchored in absolute blacks and deep charcoals to maximize the luminosity of the Solana-inspired accents. 

- **Backgrounds:** Use `#0A0A0A` for the primary canvas. `#121212` is reserved for elevated surface panels to create subtle distinction.
- **Accents:** Vibrant Purple (#9945FF) is the primary action color. Teal (#14F195) signifies success and growth, while Blue (#00C2FF) is used for informational data and secondary highlights.
- **Functional Gradients:** Use a 45-degree gradient from Purple to Teal for high-impact elements like "Connect Wallet" or "Mint" buttons. 
- **Glass Tinting:** Borders on frosted panels should use a 10-15% white stroke or a subtle 20% opacity version of the primary purple to simulate light catching the edge of a lens.

## Typography

This design system pairs the technical, geometric edges of **Space Grotesk** with the utilitarian clarity of **Inter**.

- **Headlines:** Space Grotesk is used for all major headings and brand moments. It should be set with tight letter-spacing for a modern, compressed "engine" feel.
- **Body:** Inter is the workhorse for all long-form descriptions and economy data. It provides the necessary readability against dark backgrounds.
- **Labels:** Use uppercase Space Grotesk for categories, tabs, and technical labels to reinforce the futuristic aesthetic.
- **Contrast:** Maintain high contrast by using pure white (#FFFFFF) for headlines and a slightly muted grey (#A1A1AA) for secondary body text to establish a clear hierarchy.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model with generous safe areas to mimic a premium mobile game dashboard.

- **Grid:** Use a 12-column grid for desktop and a 4-column grid for mobile.
- **Rhythm:** All spacing must be a multiple of 8px. Use 16px for internal component spacing and 64px+ for separating major content sections.
- **Spaciousness:** Avoid crowding elements. The "engine" needs room to breathe; content blocks should have a minimum of 24px internal padding to maintain the "clean and spacious" brand promise.
- **Safe Areas:** For mobile UI, ensure a 32px bottom margin to account for gesture navigation and hardware curves.

## Elevation & Depth

Depth is conveyed through **Glassmorphism** and light emission rather than physical shadows.

- **Surface Layers:** Tier 1 surfaces use #121212 at 100% opacity. Tier 2 (floating panels) uses #FFFFFF at 5% opacity with a `backdrop-filter: blur(24px)`.
- **Borders:** Panels must feature a 1px solid border. Use a semi-transparent white (20% opacity) for top and left borders, and a darker or primary-tinted stroke for bottom and right borders to simulate directional lighting.
- **Interactive Glows:** Buttons and active states should emit a "soft glow"—a drop shadow using the primary or secondary color with a 20px-30px blur and low (30%) opacity. This creates a neon-underglow effect common in futuristic cockpits.

## Shapes

The shape language is defined by large, inviting radii that soften the technicality of the typography.

- **Panels & Cards:** A standard radius of 16px is used for most cards. Large container panels should use 24px to emphasize the "glass sheet" aesthetic.
- **Interactive Elements:** Buttons utilize a slightly tighter 12px radius to feel more precise and clickable.
- **Circular Elements:** Use full pill-shapes only for status indicators (e.g., "Live," "Online") and notification badges. Avoid fully rounded corners on large layout containers to maintain a structural, architectural feel.

## Components

### Buttons
- **Primary:** Gradient fill (Purple to Teal) with white text. Hover state triggers a subtle scale increase (1.02x) and an intensified outer glow.
- **Secondary:** Ghost style with a 1px primary color border and a 5% primary color background fill.

### Cards & Panels
- **Frosted Card:** Background: `rgba(255, 255, 255, 0.05)`, Backdrop Blur: `20px`, Border: `1px solid rgba(255, 255, 255, 0.1)`.
- **Active Card:** Same as frosted, but with a 1px border using the Solana Teal to indicate selection.

### Inputs
- **Field:** Dark background (#0A0A0A) with a subtle inner shadow to look recessed. On focus, the border glows with the Blue (#00C2FF) accent.

### Gaming Specifics
- **Resource Bars:** Use the secondary teal for "Health/Progress" bars and the primary purple for "XP/Energy" bars. Background of the bar should be a dark, translucent track.
- **Rarity Chips:** Small tags with high-saturation backgrounds (Gold for Legendary, Purple for Epic, Blue for Rare) using Space Grotesk Bold.

### Navigation
- **Bottom Bar (Mobile):** A floating glass panel with a 24px radius, positioned 16px from the bottom edge. Icons use a "dual-tone" style: neutral grey when inactive, primary purple with glow when active.
