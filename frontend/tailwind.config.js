/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: "#0B0F19",
          card: "#111827",
          border: "#1F2937",
          accent: "#3B82F6",
        },
        risk: {
          safe: "#10B981",    // Emerald
          watch: "#F59E0B",   // Amber
          warning: "#F97316", // Orange
          critical: "#EF4444" // Crimson
        }
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
