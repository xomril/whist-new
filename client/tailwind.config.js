/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#1a6b3c',
          dark: '#0f4226',
          darker: '#0a2e1a',
        },
      },
      animation: {
        'card-deal': 'cardDeal 0.3s ease-out',
        'card-flip': 'cardFlip 0.4s ease-in-out',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        cardDeal: {
          '0%': { transform: 'scale(0) rotate(-20deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(251, 191, 36, 0.4)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(251, 191, 36, 0.7)' },
        },
      },
    },
  },
  plugins: [],
};
