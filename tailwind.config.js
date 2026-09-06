/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parakh: {
          bg: '#F8F6F0',       // Warm eggshell / soft stone background
          card: '#FFFFFF',     // Clean paper white
          border: '#E8E4D9',   // Warm oatmeal border
          primary: '#4A6B6C',  // Muted dusty pine / sage-slate
          primaryHover: '#3B5758',
          accent: '#D97757',   // Terracotta / warm rust (replaces neon indigo)
          accentLight: '#FBECE7',
          success: '#5B8C67',  // Soft earthy olive green
          successLight: '#EBF4EE',
          warning: '#D49B45',  // Warm muted mustard amber
          warningLight: '#FDF6EB',
          danger: '#BF5555',   // Brick / soft crimson
          dangerLight: '#F9EDED',
          dark: '#2D3234',     // Soft charcoal
          subtle: '#687074',   // Muted slate gray
        }
      }
    },
  },
  plugins: [],
}