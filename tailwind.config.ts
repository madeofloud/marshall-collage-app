import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        marshall: {
          black: '#121212',
          gold: '#c9a873',
          cream: '#fdfcf7',
        },
      },
    },
  },
  plugins: [],
};

export default config;
