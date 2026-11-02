/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#e1ecf5',
          200: '#c3d9eb',
          300: '#94bcde',
          400: '#5e9bce',
          500: '#387ebd',
          600: '#2564a2',
          700: '#1e5083',
          800: '#1b436c',
          900: '#0f2942',
          950: '#0a1a2b',
        },
      },
      fontFamily: {
        sans: ['Prompt', 'Sarabun', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
