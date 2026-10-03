import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#4B0E4B', dark: '#3B0B3B', light: '#F3E8FF' }, // buttons, logo, prices
        accent: '#9333EA',                                                // + icons, links, focus
        field: '#F5F5F5',                                                 // input background
        line: '#E5E7EB',                                                  // input and card borders
      },
    },
  },
  plugins: [],
} satisfies Config;
