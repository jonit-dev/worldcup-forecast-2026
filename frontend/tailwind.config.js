/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#172026',
        paper: '#f5f7f4',
        line: '#d9e2dc',
        moss: '#1f6d36',
        ocean: '#2d7c92',
        signal: '#8a5a00',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgb(23 32 38 / 0.04), 0 12px 32px rgb(23 32 38 / 0.06)',
      },
    },
  },
  plugins: [],
};
