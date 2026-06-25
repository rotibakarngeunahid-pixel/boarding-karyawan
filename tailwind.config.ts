import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand RBN — palet baru: Merah (primary), Kuning (secondary), Putih (base)
        rbn: {
          primary: '#D32F2F', // merah (aksen kuat)
          'primary-dark': '#B71C1C',
          'primary-light': '#EF5350',
          secondary: '#FFC107', // kuning (highlight)
          'secondary-dark': '#FFA000',
          dark: '#1A1A1A', // teks utama
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
