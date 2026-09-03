import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "-apple-system", "sans-serif"],
        brand: ["var(--font-braze)", "sans-serif"],
      },
      colors: {
        blue: {
          50: "#eeeefc",
          100: "#dcdcf9",
          200: "#b9b9f3",
          300: "#9090ea",
          400: "#6d6de6",
          500: "#5a5ae3",
          600: "#5050e1",
          700: "#4040b8",
          800: "#33338f",
          900: "#262666",
          950: "#051a39",
        },
        brand: {
          50: "#eeeefc",
          100: "#dcdcf9",
          200: "#b9b9f3",
          300: "#9090ea",
          400: "#6d6de6",
          500: "#5a5ae3",
          600: "#5050e1",
          700: "#4040b8",
          800: "#33338f",
          900: "#262666",
          950: "#051a39",
        },
        sky: {
          500: "#4040b8",
        },
        indigo: {
          600: "#4f46e5",
        },
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        xs: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
      },
      animation: {
        "spin-slow": "spin 6s linear infinite",
        "scan-bar": "scan-bar 1.1s ease-in-out infinite",
        "float-soft": "float-soft 2.4s ease-in-out infinite",
      },
      keyframes: {
        "scan-bar": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(150%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
