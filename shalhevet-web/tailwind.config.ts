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
        background: "#0f0f10",
        surface: "#18181b",
        "surface-light": "#202024",
        accent: "#f08000",
        "accent-dark": "#e05010",
        "text-primary": "#f4f4f5",
        "text-muted": "#b6b6bd",
        border: "#2a2a31",
      },
      fontFamily: {
        heebo: ["Heebo", "sans-serif"],
      },
      maxWidth: {
        mobile: "480px",
      },
    },
  },
  plugins: [],
};
export default config;
