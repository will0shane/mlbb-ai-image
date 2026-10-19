/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070C16",
          900: "#0B1220",
          850: "#0F182B",
          800: "#14213B",
          700: "#1E3054",
          600: "#2B4476",
        },
        gold: {
          400: "#FCD34D",
          500: "#F5C451",
          600: "#D9A229",
        },
        tier: {
          4000: "#E5322D",
          3000: "#F59E0B",
          2000: "#D946A8",
          500: "#A78BFA",
          400: "#7C5CFF",
          200: "#38BDF8",
          100: "#34D399",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      }
    },
  },
  plugins: [],
}
