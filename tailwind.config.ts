import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  safelist: [
    'bg-blue-200',
    'bg-sky-200',
    'bg-cyan-200',
    'bg-teal-200',
    'bg-emerald-200',
    'bg-green-200',
    'bg-lime-200',
    'bg-yellow-200',
    'bg-amber-200',
    'bg-orange-200',
    'bg-red-200',
    'bg-rose-200',
    'bg-pink-200',
    'bg-purple-200',
  ],
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
        'dm-mono': ["var(--font-dm-mono)", "monospace"],
      },
      fontSize: {
        // Headings (Fustat)
        'h1': ['18px', { lineHeight: '26px', fontWeight: '700', letterSpacing: '-0.02em' }],  // Trip title
        'h2': ['16px', { lineHeight: '24px', fontWeight: '600', letterSpacing: '-0.02em' }],  // Dates, subheading
        'h3': ['14px', { lineHeight: '20px', fontWeight: '600', letterSpacing: '-0.02em' }],  // Badge text, card title
        'h4': ['12px', { lineHeight: '18px', fontWeight: '600', letterSpacing: '-0.02em' }],  // Small headings
        // Body (Inter)
        'body': ['14px', { lineHeight: '18px', fontWeight: '400', letterSpacing: '-0.02em' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400', letterSpacing: '-0.02em' }],
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
        // Text colors (using Tailwind neutral palette)
        text: {
          primary: 'rgb(38 38 38 / <alpha-value>)',     // neutral-800
          secondary: 'rgb(115 115 115 / <alpha-value>)', // neutral-500
          tertiary: 'rgb(163 163 163 / <alpha-value>)', // neutral-400
          inverse: '#ffffff',
          accent: 'rgb(96 165 250 / <alpha-value>)',    // blue-400
        },
        // Border colors
        'border-muted': 'rgb(229 229 229 / <alpha-value>)', // neutral-200
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
