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
        'sidebar-bg': '#f8f9fa',
        'border-color': '#e5e7eb',
        'glass-bg': 'rgba(255, 255, 255, 0.05)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
        'neon-blue': '#00f3ff',
        'neon-purple': '#bc13fe',
        'dark-base': '#0a0a0f',
        'dark-surface': '#13131f',
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(0, 243, 255, 0.3)',
        'neon-purple': '0 0 10px rgba(188, 19, 254, 0.5), 0 0 20px rgba(188, 19, 254, 0.3)',
        '3d': '4px 4px 10px rgba(0,0,0,0.5), -2px -2px 10px rgba(255,255,255,0.05)',
        'inner-3d': 'inset 4px 4px 10px rgba(0,0,0,0.5), inset -2px -2px 10px rgba(255,255,255,0.05)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
