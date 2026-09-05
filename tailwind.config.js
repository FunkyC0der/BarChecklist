const { cupcakeRgb } = require('./src/constants/theme.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: cupcakeRgb,
      borderRadius: {
        selector: '16px',
        field: '32px',
        box: '16px',
      },
      borderWidth: { DEFAULT: '2px' },
      boxShadow: {
        cupcake:
          '0 2px 0 rgba(41, 19, 52, 0.08), 0 8px 20px rgba(41, 19, 52, 0.08)',
      },
    },
  },
  plugins: [],
};
