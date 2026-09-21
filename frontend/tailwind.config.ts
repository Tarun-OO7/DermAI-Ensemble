import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-noto-sans)",
          "var(--font-noto-devanagari)",
          "var(--font-noto-tamil)",
          "var(--font-noto-telugu)",
          "var(--font-noto-bengali)",
          "var(--font-noto-kannada)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      keyframes: {
        scan: {
          '0%, 100%': { top: '0%' },
          '50%': { top: '92%' },
        },
      },
      animation: {
        scan: 'scan 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
