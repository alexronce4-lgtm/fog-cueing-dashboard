import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b1120",
        panel: "#111a2e",
        accent: "#38bdf8",
      },
      keyframes: {
        pulseCue: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.35", transform: "scale(0.94)" },
        },
      },
      animation: {
        pulseCue: "pulseCue 0.66s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
