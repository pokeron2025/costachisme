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
                                        50: '#f0fdf4',   // Verde muy claro
                                        100: '#dcfce7',  // Verde claro
                                        200: '#bbf7d0',  // Verde suave
                                        300: '#86efac',  // Verde medio-claro
                                        400: '#4ade80',  // Verde medio
                                        500: '#22c55e',  // Verde vibrante principal
                                        600: '#16a34a',  // Verde oscuro
                                        700: '#15803d',  // Verde muy oscuro
                                        800: '#166534',  // Verde profundo
                                        900: '#145231',  // Verde casi negro
                            },
                            accent: {
                                        50: '#fdf2f8',   // Rosa muy claro
                                        100: '#fce7f3',
                                        200: '#fbcfe8',
                                        300: '#f472b6',  // Rosa vibrante para acentos
                                        400: '#ec4899',
                                        500: '#db2777',
                                        600: '#be185d',
                            },
                            gradient: {
                                        start: '#22c55e',    // Verde vibrante
                                        mid: '#06b6d4',      // Cyan
                                        end: '#8b5cf6',      // Púrpura
                            },
                            surface: {
                                        light: '#ffffff',
                                        light_alt: '#f8fafc',
                                        dark: '#0f172a',     // slate-900
                                        dark_alt: '#1e293b'  // slate-800
                            }
                  },
                  backgroundImage: {
                            'gradient-brand': 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #8b5cf6 100%)',
                            'gradient-subtle': 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                            'gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  },
                  boxShadow: {
                            soft: '0 6px 24px rgba(2, 6, 23, 0.08)',
                            brand: '0 20px 25px -5px rgba(34, 197, 94, 0.15)',
                            glow: '0 0 20px rgba(34, 197, 94, 0.3)',
                  },
                  keyframes: {
                            'fade-in': { 
                              from: { opacity: 0, transform: 'translateY(4px)' }, 
                                        to: { opacity: 1, transform: 'translateY(0)' } 
                            },
                            'bump': { 
                              '0%,100%': { transform: 'scale(1)' }, 
                                        '50%': { transform: 'scale(1.08)' } 
                            },
                            'slide-in': {
                                        from: { opacity: 0, transform: 'translateX(-10px)' },
                                        to: { opacity: 1, transform: 'translateX(0)' }
                            },
                            'pulse-glow': {
                                        '0%, 100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' },
                                        '50%': { boxShadow: '0 0 40px rgba(34, 197, 94, 0.8)' }
                            }
                  },
                  animation: {
                            'fade-in': 'fade-in .35s ease-out both',
                            'bump': 'bump .25s ease-out',
                            'slide-in': 'slide-in .4s ease-out',
                            'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                  },
          },
    },
    plugins: [],
}
