/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
      primary: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
      accent: {
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
      },
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
      white: '#ffffff',
      red: {
        600: '#dc2626',
        700: '#b91c1c',
      },
      green: {
        600: '#16a34a',
      },
      yellow: {
        100: '#fef3c7',
      },
      blue: {
        50: '#eff6ff',
      },
      black: '#000000',
    },
    fontFamily: {
      display: ['Poppins', 'sans-serif'],
      body: ['Inter', 'sans-serif'],
    },
    },
  },
}
