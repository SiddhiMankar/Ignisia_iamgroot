/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        slate: {
          950: '#0B0F19',
          900: '#111827',
          800: '#1F2937',
          700: '#374151',
        },
        brand: {
          600: '#2563EB',
          500: '#3B82F6',
          400: '#60A5FA',
        }
      }
    },
  },
  plugins: [],
}
