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
    },
  },
  plugins: [],
};
