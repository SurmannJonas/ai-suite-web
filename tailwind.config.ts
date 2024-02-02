import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: '#191819',

        accent: '#6158C5',
        primary: '#18161D',

      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
