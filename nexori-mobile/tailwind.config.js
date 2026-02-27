/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#191E2B',
        secondary: '#253045',
        accent: '#00C6E6',
        surface: '#FFFFFF',
        background: '#BFC0D1',
      },
    },
  },
  plugins: [],
};