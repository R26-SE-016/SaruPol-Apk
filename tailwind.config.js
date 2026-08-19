/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.tsx', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#f0f9f3',
          100: '#dcf0e4',
          200: '#bbe3ca',
          300: '#8acead',
          400: '#52b285',
          500: '#2d9165',
          600: '#1e7550',
          700: '#1b5e41',
          800: '#1B4D3E',
          900: '#153829',
          950: '#0b2018',
        },
      },
    },
  },
  plugins: [],
};
