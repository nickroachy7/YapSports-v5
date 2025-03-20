/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark charcoal and grey color palette
        charcoal: {
          900: '#1A1A1A', // Very dark charcoal (almost black)
          800: '#252525', // Dark charcoal (for background)
          700: '#2E2E2E', // Slightly lighter charcoal
          600: '#3A3A3A', // Medium charcoal
          500: '#454545', // Medium-light charcoal
        },
        grey: {
          900: '#525252', // Dark grey
          800: '#6E6E6E', // Medium-dark grey
          700: '#8A8A8A', // Medium grey
          600: '#A6A6A6', // Medium-light grey
          500: '#C2C2C2', // Light grey
          400: '#DEDEDE', // Very light grey
        },
      },
    },
  },
  plugins: [],
} 