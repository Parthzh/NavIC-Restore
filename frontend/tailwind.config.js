/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#060913',
          800: '#0c1222',
          700: '#141c33',
          600: '#1e294b',
        },
        navic: {
          orange: '#FF6F00',
          amber: '#FFA000',
          blue: '#0288D1',
          cyan: '#00E5FF',
          green: '#00E676',
          red: '#FF1744',
          yellow: '#FFEA00'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
