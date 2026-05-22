/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#0d0b1a',
          raised: '#110f22',
          overlay: '#16132a',
        },
        accent: {
          DEFAULT: '#7c3aed',
          soft: '#a78bfa',
          muted: '#6d28d9',
        },
      },
    },
  },
  plugins: [],
}
