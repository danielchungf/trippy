import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        fustat: ["var(--font-fustat)", "sans-serif"],
      },
      fontSize: {
        // Headings (Fustat)
        'h1': ['24px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'h2': ['18px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.02em' }],
        'h3': ['16px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.02em' }],
        // Body (Inter)
        'body': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        'body-sm': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        'body-xs': ['10px', { lineHeight: '1.4', fontWeight: '500' }],
        // Labels
        'label': ['12px', { lineHeight: '1.4', fontWeight: '700' }],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Content colors (for text)
        content: {
          primary: 'rgb(var(--color-neutral-800) / <alpha-value>)',
          secondary: 'rgb(var(--color-neutral-500) / <alpha-value>)',
          tertiary: 'rgb(var(--color-neutral-400) / <alpha-value>)',
          inverse: '#ffffff',
        },
        // Legacy text colors (for backwards compatibility)
        text: {
          primary: '#2f2f2f',
          secondary: '#525252',
          muted: '#a1a1a1',
          inverse: '#ffffff',
        },
        // UI accent colors
        'accent-blue': {
          DEFAULT: '#51a2ff',
          hover: '#4090e8',
        },
        'accent-cyan': '#00b3ff',
        // Surface colors
        surface: {
          light: '#f5f5f5',
          border: '#e5e5e5',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
