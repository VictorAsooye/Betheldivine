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
        navy: "#1a2e4a",
        "navy-deep": "#122038",
        "navy-mid": "#223a5e",
        gold: "#c8991a",
        "gold-light": "#e8b830",
        "off-white": "#f7f9fc",
        "gray-200": "#dce2ec",
        "gray-400": "#8e9ab0",
        green: "#2d8a5e",
        red: "#c0392b",
        teal: "#2AADAD",
      },
      fontFamily: {
        lora: ["var(--font-lora)", "Georgia", "serif"],
        sans: ["var(--font-source-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
