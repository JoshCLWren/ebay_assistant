/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep obsidian background palette
        ink: {
          50: '#f6f7f9',
          100: '#edeef2',
          200: '#d7dae2',
          300: '#b5bbc9',
          400: '#8e97ab',
          500: '#6d768f',
          600: '#565d73',
          700: '#464b5d',
          800: '#3a3e4b',
          900: '#323541', // Slightly lighter than pure black for depth
          950: '#020617', // Deepest background
        },
        // Electric Violet primary
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        // Teal/Cyan accent
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
      },
      fontFamily: {
        display: ['"Outfit"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -10px rgba(0,0,0,0.5)',
        'glow-primary': '0 0 20px -5px rgba(139, 92, 246, 0.5)',
        'glow-accent': '0 0 20px -5px rgba(20, 184, 166, 0.5)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      screens: {
        xs: '375px', // Small mobile
      },
    },
  },
  plugins: [],
}
