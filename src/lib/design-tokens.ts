/**
 * Design Tokens Reference
 *
 * This file documents the design system tokens used throughout the app.
 * The actual values are defined in tailwind.config.ts and globals.css.
 *
 * =====================================================================
 * TYPOGRAPHY CLASSES (globals.css)
 * =====================================================================
 *
 * Headings (Fustat font):
 * - .text-h1: 18px, bold (700), 26px line-height, -2% tracking - Trip title
 * - .text-h2: 16px, semibold (600), 24px line-height, -2% tracking - Dates, subheading
 * - .text-h3: 14px, semibold (600), 20px line-height, -2% tracking - Badge text, card title
 * - .text-h4: 12px, semibold (600), 18px line-height, -2% tracking - Small headings
 *
 * Body text (Inter font, regular):
 * - .text-body: 14px, 18px line-height, -2% tracking - Primary body text
 * - .text-small: 12px, 16px line-height, -2% tracking - Secondary body text
 *
 * Labels (Fustat font, bold):
 * - .text-label: 12px - Badges
 *
 * =====================================================================
 * TAILWIND COLORS (tailwind.config.ts)
 * =====================================================================
 *
 * Text colors (using Tailwind neutral palette):
 * - text-text-primary (neutral-800) - Main text color
 * - text-text-secondary (neutral-500) - Supporting text, icons
 * - text-text-tertiary (neutral-400) - Disabled, placeholder, subtle text
 * - text-text-inverse (#ffffff) - Text on dark backgrounds
 * - text-text-accent (#FF591E) - Accent/link text
 *
 * Border colors:
 * - border-border-muted (neutral-200) - Subtle borders, dividers
 * - border-border-regular (neutral-300) - Input hover/focus borders
 *
 * Usage examples:
 *   text-text-primary
 *   text-text-secondary
 *   border-border-muted
 *
 * =====================================================================
 * FONTS
 * =====================================================================
 *
 * - font-fustat - Headings, buttons, labels (loaded from local files)
 * - font-inter - Body text (loaded from Google Fonts, default)
 *
 * =====================================================================
 * ICON STYLING PATTERNS (Lucide React icons)
 * =====================================================================
 *
 * CRITICAL: Use consistent stroke weights based on context.
 *
 * 1. Button Icons (leftIcon/rightIcon in Button component):
 *    - Size: 16px
 *    - Stroke: stroke-[2]
 *    - Pattern: Handled automatically by Button component
 *    - Reference: src/components/ui/button.tsx
 *
 * 2. NakedIconButton Icons:
 *    - Container: 28x28px button, 20x20px icon area
 *    - Stroke: stroke-[1.8]
 *    - Pattern: Handled automatically by NakedIconButton
 *    - Reference: src/components/ui/naked-icon-button.tsx
 *
 * 3. View Toggle Icons (Grid/Map, List/Timeline switches):
 *    - Container: w-7 h-7 (28px)
 *    - Icon: h-4 w-4 (16px)
 *    - Stroke: stroke-[2.25] on parent button
 *    - Pattern:
 *      <button className="... [&>svg]:stroke-[2.25]">
 *        <IconName className="h-4 w-4" />
 *      </button>
 *
 * 4. Standalone Indicator Icons (badges, informational):
 *    - Size: w-4 h-4 (16px)
 *    - Stroke: stroke-[2.25]
 *    - Pattern:
 *      <span className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.25] text-[color]">
 *        <IconName />
 *      </span>
 *
 * Quick Reference:
 * | Context              | Size | Stroke |
 * |----------------------|------|--------|
 * | Button leftIcon      | 16px | 2      |
 * | NakedIconButton      | 20px | 1.8    |
 * | View toggle buttons  | 16px | 2.25   |
 * | Standalone/indicator | 16px | 2.25   |
 */

export const tokens = {
  colors: {
    text: {
      primary: 'neutral-800',   // rgb(38 38 38)
      secondary: 'neutral-500', // rgb(115 115 115)
      tertiary: 'neutral-400',  // rgb(163 163 163)
      inverse: '#ffffff',
      accent: '#FF591E',        // orange accent
    },
    border: {
      muted: 'neutral-200',     // rgb(229 229 229)
      regular: 'neutral-300',   // rgb(212 212 212)
    },
  },
  typography: {
    h1: { size: '18px', weight: '700', lineHeight: '26px', tracking: '-0.02em' },  // Trip title
    h2: { size: '16px', weight: '600', lineHeight: '24px', tracking: '-0.02em' },  // Dates, subheading
    h3: { size: '14px', weight: '600', lineHeight: '20px', tracking: '-0.02em' },  // Badge text, card title
    h4: { size: '12px', weight: '600', lineHeight: '18px', tracking: '-0.02em' },  // Small headings
    body: { size: '14px', weight: '400', lineHeight: '18px', tracking: '-0.02em' },
    bodySm: { size: '12px', weight: '400', lineHeight: '16px', tracking: '-0.02em' },
    label: { size: '12px', weight: '700', lineHeight: '1.4' },
  },
} as const

export type DesignTokens = typeof tokens
