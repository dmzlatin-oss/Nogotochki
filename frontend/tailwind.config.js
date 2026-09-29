/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      colors: {
        primary: {
          50: '#FBF3EE',
          100: '#F5E1D3',
          200: '#EAC3A8',
          300: '#DEA179',
          400: '#D0804F',
          500: '#C2673D',
          600: '#A8532E',
          700: '#864024',
          800: '#63301B',
          900: '#402013',
        },
        ink: {
          50: '#F4F5F5',
          100: '#E4E6E7',
          200: '#C7CBCE',
          300: '#A2A8AC',
          400: '#767E84',
          500: '#565F66',
          600: '#3F474D',
          700: '#2E3439',
          800: '#1F2327',
          900: '#14171A',
        },
        gold: {
          50: '#FDF8EC',
          100: '#F9ECC7',
          200: '#F1D68A',
          300: '#E7BC52',
          400: '#DBA52D',
          500: '#C68B1F',
          600: '#A16E17',
          700: '#7A5314',
          800: '#563C13',
          900: '#392712',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 23, 26, 0.04), 0 8px 24px rgba(20, 23, 26, 0.06)',
      },
    },
  },
  plugins: [],
};
