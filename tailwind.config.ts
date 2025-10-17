import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00897b",
        secondary: "#004d40",
        background: "#ffffff",
        foreground: "#111827",
        muted: "#f3f4f6",
        "muted-foreground": "#6b7280",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      }
    },
  },
  plugins: [],
};

export default config;
