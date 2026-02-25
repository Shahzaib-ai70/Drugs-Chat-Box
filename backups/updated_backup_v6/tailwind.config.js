/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#3b82f6', // Adjust based on image later
        'sidebar-bg': '#f8f9fa',
        'border-color': '#e5e7eb',
      }
    },
  },
  plugins: [],
}
