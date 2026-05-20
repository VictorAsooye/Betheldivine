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
        // Legacy tokens (kept for backward compat)
        "navy-deep": "#122038",
        "navy-mid": "#223a5e",
        "gold-light": "#e8b830",
        "off-white": "#f7f9fc",
        "gray-200": "#dce2ec",
        "gray-400": "#8e9ab0",
        green: "#2d8a5e",
        red: "#c0392b",
        teal: "#2AADAD",

        // Design tokens
        paper:     "#FAF8F4",
        paper2:    "#F3EFE7",
        line:      "#E4DFD5",
        line2:     "#D4CEC0",
        muted:     "#8C8576",
        ink3:      "#6B6557",
        ink2:      "#3A362E",
        ink:       "#1C1A16",
        navy:      "#0D1B2A",
        gold:      "#C9A84C",
        slate:     "#4A5A7A",
        slateWash: "#EEF0F5",

        // Semantic colors
        success: {
          bg:     "#D1FAE5",
          text:   "#065F46",
          border: "#6EE7B7",
        },
        warning: {
          bg:     "#FEF3C7",
          text:   "#92400E",
          border: "#FCD34D",
        },
        danger: {
          bg:     "#FEE2E2",
          text:   "#991B1B",
          border: "#FECACA",
        },
        info: {
          bg:     "#DBEAFE",
          text:   "#1E40AF",
          border: "#93C5FD",
        },
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
