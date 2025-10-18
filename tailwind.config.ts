/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ⬅️ habilita modo oscuro por clase .dark
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8f5f2',
          100: '#cfeae3',
          200: '#a0d4c7',
          300: '#72bdaa',
          400: '#48a993',
          500: '#2f7d6d', // tu verde
          600: '#276559',
          700: '#1f4e45',
          800: '#163833',
          900: '#0f2724',
        },
        surface: {
          light: '#ffffff',
          dark:  '#0f172a' // slate-900
        }
      },
      boxShadow: {
        soft: '0 6px 24px rgba(2, 6, 23, 0.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'bump': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
      },
      animation: {
        'fade-in': 'fade-in .35s ease-out both',
        'bump': 'bump .25s ease-out',
      },
    },
  },
  plugins: [],
}
