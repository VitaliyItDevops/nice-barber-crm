import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: "#0B0B0C",
          800: "#141416",
          700: "#1C1C1F",
          600: "#2A2A2E",
        },
        gold: {
          DEFAULT: "#F5A623",
          dim: "#C4841C",
          pale: "#FFD88A",
        },
        cream: "#F4EDE1",
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      letterSpacing: {
        brand: "0.28em",
      },
      backgroundImage: {
        "stripe-gold":
          "repeating-linear-gradient(-45deg, #F5A623 0 10px, #0B0B0C 10px 20px, #F4EDE1 20px 30px, #0B0B0C 30px 40px)",
      },
    },
  },
  plugins: [],
};
export default config;
