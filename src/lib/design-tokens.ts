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
 * - .text-h1: 24px, bold, -0.02em tracking - Page titles, section headers
 * - .text-h2: 18px, semibold, -0.02em tracking - Card titles
 * - .text-h3: 16px, semibold, -0.02em tracking - Section titles, button text
 *
 * Body text (Inter font, default):
 * - .text-body: 14px, regular - Primary body text
 * - .text-body-secondary: 14px, regular, secondary color
 * - .text-body-muted: 14px, regular, muted color
 * - .text-small: 12px, regular, secondary color
 *
 * Labels (Fustat font):
 * - .text-label: 12px, bold - Badges, countdown labels
 *
 * Buttons (Fustat font):
 * - .text-button: 16px, semibold, white - Primary button text
 * - .text-button-secondary: 16px, semibold, secondary - Outline button text
 *
 * Legacy classes (backwards compatible):
 * - .heading-24: Same as .text-h1
 * - .heading-16: Same as .text-h3
 * - .heading-12: Same as .text-label
 *
 * =====================================================================
 * TAILWIND COLORS (tailwind.config.ts)
 * =====================================================================
 *
 * Text colors (use with text-*):
 * - text-text-primary (#2f2f2f) - Main text color
 * - text-text-secondary (#525252) - Supporting text, icons
 * - text-text-muted (#a1a1a1) - Disabled, placeholder, subtle text
 * - text-text-inverse (#ffffff) - Text on dark backgrounds
 *
 * Accent colors (use with bg-*, border-*):
 * - accent-blue (#51a2ff) - Primary action buttons
 * - accent-blue-hover (#4090e8) - Hover state for blue buttons
 * - accent-cyan (#00b3ff) - Active tabs, highlights
 *
 * Surface colors (use with bg-*, border-*):
 * - surface-light (#f5f5f5) - Backgrounds, skeletons, hover states
 * - surface-border (#e5e5e5) - Borders, dividers
 *
 * Usage examples:
 *   bg-surface-light
 *   text-text-primary
 *   border-surface-border
 *   bg-accent-blue hover:bg-accent-blue-hover
 *
 * =====================================================================
 * FONTS
 * =====================================================================
 *
 * - font-fustat - Headings, buttons, labels (loaded from local files)
 * - font-inter - Body text (loaded from Google Fonts, default)
 */

export const tokens = {
  colors: {
    text: {
      primary: '#2f2f2f',
      secondary: '#525252',
      muted: '#a1a1a1',
      inverse: '#ffffff',
    },
    accent: {
      blue: '#51a2ff',
      blueHover: '#4090e8',
      cyan: '#00b3ff',
    },
    surface: {
      light: '#f5f5f5',
      border: '#e5e5e5',
    },
  },
  typography: {
    h1: { size: '24px', weight: '700', lineHeight: '1.2', letterSpacing: '-0.02em' },
    h2: { size: '18px', weight: '600', lineHeight: '1.3', letterSpacing: '-0.02em' },
    h3: { size: '16px', weight: '600', lineHeight: '1.3', letterSpacing: '-0.02em' },
    body: { size: '14px', weight: '400', lineHeight: '1.5' },
    bodySm: { size: '12px', weight: '400', lineHeight: '1.5' },
    bodyXs: { size: '10px', weight: '400', lineHeight: '1.4' },
    label: { size: '12px', weight: '700', lineHeight: '1.4' },
  },
} as const

export type DesignTokens = typeof tokens
