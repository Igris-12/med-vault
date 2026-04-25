/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0A0D14',
        surface: '#111827',
        card: '#161D2F',
        'card-hover': '#1C2540',
        'border-dim': 'rgba(255,255,255,0.06)',
        'border-mid': 'rgba(255,255,255,0.12)',
        teal: {
          DEFAULT: '#00E5C3',
          dark: '#00B89D',
          text: '#0A0D14',
        },
        coral: {
          DEFAULT: '#FF4A6E',
          dark: '#CC3A58',
          text: '#0A0D14',
        },
        amber: {
          DEFAULT: '#F5A623',
          dark: '#C4841B',
          text: '#0A0D14',
        },
        'text-primary': '#F0F4FF',
        'text-muted': '#8B97B0',
        'text-faint': '#4A5568',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        slideInUp: { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'teal-glow': '0 0 20px rgba(0,229,195,0.2)',
        'coral-glow': '0 0 20px rgba(255,74,110,0.2)',
      },
    },
  },
  plugins: [],
};
