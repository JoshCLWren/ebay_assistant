/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f4f5f7',
          100: '#e2e4e8',
          200: '#c7ccd5',
          300: '#a2a9b8',
          400: '#7c8399',
          500: '#5f667f',
          600: '#494e63',
          700: '#383c4d',
          800: '#222533',
          900: '#181b27',
        },
      },
      fontFamily: {
        display: ['"SF Pro Display"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
}
