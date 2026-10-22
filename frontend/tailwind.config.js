/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          dark: '#171717',
          light: '#FAFAF9',
        },
        sidebar: {
          dark: '#111111',
          light: '#F7F7F5',
        },
        input: {
          dark: '#222222',
          light: '#F7F7F7',
        },
        border: {
          dark: '#303030',
          light: '#E5E5E5',
        },
        text: {
          'primary-dark': '#F3F3F3',
          'secondary-dark': '#A1A1AA',
          'primary-light': '#202020',
          'secondary-light': '#71717A',
        },
        accent: {
          DEFAULT: 'var(--lucas-accent, #A3B18A)',
          hover: 'var(--lucas-accent-hover, #8E9E74)',
          subtle: 'var(--lucas-accent-subtle, rgba(163, 177, 138, 0.15))',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', 'monospace'],
      },
      maxWidth: {
        'readable': '820px',
      }
    },
  },
  plugins: [],
};
