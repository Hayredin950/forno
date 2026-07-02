/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'forno-bg': {
          primary: '#0D0B0A',
          secondary: '#16120F',
          tertiary: '#1E1A15',
        },
        'forno-accent': {
          amber: '#FF6B35',
          gold: '#F7931E',
          red: '#C1440E',
        },
        'forno-text': {
          primary: '#F5F1EA',
          secondary: '#A39A8E',
          muted: '#6B6258',
        },
        'forno-status': {
          success: '#7CB342',
          warning: '#F9A825',
          error: '#E53935',
        },
        'forno-border': 'rgba(245, 241, 234, 0.08)',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'elevated': '0 8px 40px rgba(0, 0, 0, 0.5)',
        'glow-amber': '0 0 20px rgba(255, 107, 53, 0.3)',
      },
      backdropBlur: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
}
