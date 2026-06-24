/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#8192f8',
          500: '#6066f1',
          600: '#4847e5',
          700: '#3b39ca',
          800: '#2f2fa3',
          900: '#1E293B',
          950: '#0F172A',
        },
        teal: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        risk: {
          high:   '#DC2626',
          medium: '#D97706',
          low:    '#16A34A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'spin-once':   'spin 0.6s ease-out',
        'gauge-fill':  'gaugeFill 1s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        gaugeFill: {
          from: { strokeDashoffset: '251' },
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        'action-bar': '0 -4px 16px 0 rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
}
