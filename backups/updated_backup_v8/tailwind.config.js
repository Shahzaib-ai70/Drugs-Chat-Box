/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#3b82f6',
        'sidebar-bg': '#ffffff',
        'border-color': '#e5e7eb',
        'glass-bg': 'rgba(255, 255, 255, 0.8)',
        'glass-border': 'rgba(0, 0, 0, 0.1)',
        'neon-blue': '#0ea5e9', // Sky-500 (Darker than neon for light mode visibility)
        'neon-purple': '#9333ea', // Purple-600
        'dark-base': '#f0f2f5', // Actually Light Base now
        'dark-surface': '#ffffff', // Actually Light Surface now
      },
      boxShadow: {
        'neon': '0 0 10px rgba(14, 165, 233, 0.3)',
        'neon-purple': '0 0 10px rgba(147, 51, 234, 0.3)',
        '3d': '4px 4px 10px rgba(0,0,0,0.1), -2px -2px 10px rgba(255,255,255,0.8)',
        'inner-3d': 'inset 2px 2px 5px rgba(0,0,0,0.1), inset -2px -2px 5px rgba(255,255,255,0.8)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
