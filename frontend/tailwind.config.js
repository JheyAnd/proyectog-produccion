import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // PC Mejia corporate blue (from logo "PC")
        primary: {
          25: '#f8fafd',
          50: '#eef4fb',
          100: '#d4e3f5',
          200: '#a9c8eb',
          300: '#7eade1',
          400: '#4d8fd4',
          500: '#2670be',
          600: '#1b5eab',  // Main brand color
          700: '#164d8e',
          800: '#113d71',
          900: '#0c2d54',
          950: '#081e38',
        },
        // PC Mejia corporate gray (from logo "Mejia/Ingenieria")
        steel: {
          25: '#fafbfb',
          50: '#f6f7f8',
          100: '#ecedef',
          200: '#d5d7db',
          300: '#b5b8be',
          400: '#8b8e96',  // Main gray from logo
          500: '#6e7179',
          600: '#585b62',
          700: '#474951',
          800: '#363840',
          900: '#282a30',
          950: '#1a1c21',
        },
        accent: {
          50: '#fef9ec',
          100: '#fcefc6',
          200: '#f9dfa2',
          300: '#f6cc7a',
          400: '#e8b85a',
          500: '#daa835',
          600: '#d4a017',  // Logo gold
          700: '#c9950d',
          800: '#b8860b',
          900: '#8b6914',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#dc2626',
          600: '#b91c1c',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
        },
        warning: {
          50: '#fef3c7',
          100: '#fde68a',
          500: '#eab308',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Display scale (headlines)
        'display-lg': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'display-md': ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
        'display-sm': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],
        // Heading scale
        'h1': ['1.875rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h2': ['1.5rem', { lineHeight: '1.35', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        // Body scale
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],
        // Utility text
        'caption': ['0.625rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(27, 94, 171, 0.08), 0 1px 2px -1px rgba(27, 94, 171, 0.08)',
        'card-hover': '0 4px 12px 0 rgba(27, 94, 171, 0.12), 0 2px 4px -2px rgba(27, 94, 171, 0.08)',
      },
      borderRadius: {
        'xs': '0.25rem',
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
    },
  },
  safelist: [
    // Dynamic color classes for modules and scenarios
    {
      pattern: /^(bg|border|text|ring)-(violet|amber|teal|rose|indigo|emerald|red|blue|green|yellow|primary|steel|accent|success|danger|warning)-(25|50|100|200|300|400|500|600|700|800|900|950)$/,
    },
    {
      pattern: /^focus:ring-(violet|amber|teal|rose|indigo|primary)-(400|500)$/,
    },
    {
      pattern: /^dark:(bg|text|border)-(steel|primary|accent|success|danger|warning)-(25|50|100|200|300|400|500|600|700|800|900|950)$/,
    },
    {
      pattern: /^dark:hover:(bg|text)-(steel|primary)-(50|100|200|600|700|800)$/,
    },
  ],
  plugins: [],
};
