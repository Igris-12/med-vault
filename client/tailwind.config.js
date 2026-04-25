/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Core surfaces — NOW use CSS vars ─────────────────────
           applyThemeVars() sets these on :root so ALL legacy pages
           automatically respect the active theme.              */
        void:         'var(--dd-bg)',
        surface:      'var(--dd-surface)',
        card:         'var(--dd-card)',
        'card-hover': 'var(--dd-card-hover)',
        'border-dim': 'var(--dd-border)',
        'border-mid': 'var(--dd-border-active)',

        /* ── Text ─────────────────────────────────────────────── */
        'text-primary': 'var(--dd-text)',
        'text-muted':   'var(--dd-text-muted)',
        'text-faint':   'var(--dd-text-dim)',

        /* ── Accent ───────────────────────────────────────────── */
        teal: {
          DEFAULT: '#00E5C3',
          dark:    '#00B89D',
          text:    '#0A0D14',
        },
        coral: {
          DEFAULT: '#FF4A6E',
          dark:    '#CC3A58',
          text:    '#0A0D14',
        },
        amber: {
          DEFAULT: '#F5A623',
          dark:    '#C4841B',
          text:    '#0A0D14',
        },

        /* ── WA Reminder module ───────────────────────────────── */
        'wa-green': {
          DEFAULT: '#22c55e',
          dark:    '#16a34a',
          light:   '#4ade80',
          text:    '#052e16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow':      'pulse 3s ease-in-out infinite',
        'fade-in':         'fadeIn 0.3s ease-out',
        'slide-in-right':  'slideInRight 0.3s ease-out',
        'slide-in-up':     'slideInUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' },                             to: { opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(100%)' },            to: { transform: 'translateX(0)' } },
        slideInUp:    { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      boxShadow: {
        card:        '0 2px 12px rgba(0,0,0,0.08)',
        'teal-glow': '0 0 20px rgba(0,229,195,0.2)',
        'coral-glow':'0 0 20px rgba(255,74,110,0.2)',
      },
    },
  },
  plugins: [],
};
