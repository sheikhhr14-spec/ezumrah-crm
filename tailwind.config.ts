import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#b8923f', light: '#d4b27a', dark: '#8a6d2f' },
        ink: '#14141f',
      },
    },
  },
  plugins: [],
};
export default config;
