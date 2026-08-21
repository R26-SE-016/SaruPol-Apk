/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.tsx', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // App Theme Brand Colors
        brand: {
          primary: '#1B5E20',       // Deep Tropical Green
          primaryLight: '#4CAF50',  // Vibrant Green
          accent: '#FF8F00',        // Golden Coconut Amber
          accentLight: '#FFB300',   // Warm Gold
          background: '#0A1F0D',    // Deep Forest Green
          surface: '#122617',       // Dark Leaf
          surfaceLight: '#1B3522',  // Lighter Leaf Green
          healthy: '#66BB6A',       // Fresh Healthy Green
          diseased: '#EF5350',      // Disease Warning Red
          warning: '#FFCA28',       // Caution Yellow
          info: '#29B6F6',          // Informational Blue
        },
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
