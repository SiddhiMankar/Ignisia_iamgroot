/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Public Sans"', 'sans-serif'],
      },
      colors: {
        primary: '#000000',
        'primary-container': '#f3f4f6',
        'primary-fixed': '#e5e7eb',
        secondary: '#4b5563',
        'secondary-fixed': '#d1d5db',
        'secondary-container': '#e5e7eb',
        background: '#fafafa', // A little off-white as requested
        surface: '#ffffff',
        'surface-container-low': '#f9fafb',
        'surface-container-lowest': '#f3f4f6',
        'surface-container-high': '#e5e7eb',
        'surface-container-highest': '#d1d5db',
        'on-surface': '#111827',
        'on-surface-variant': '#4b5563',
        'outline-variant': '#d1d5db', // middle ground subtle border
        'outline-strong': '#a3a3a3', // middle ground prominent border
        'error-container': '#fee2e2',
        'surface-tint': '#000000',
      },
      boxShadow: {
        ghost: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      backdropBlur: {
        md: '16px',
      },
    },
  },
  plugins: [],
};
