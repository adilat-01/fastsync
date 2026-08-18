/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Heebo", "Assistant", "system-ui", "sans-serif"],
      },
      colors: {
        paper: "#f7f3ee",
        ink: "#1c1917",
        accent: {
          DEFAULT: "#0f766e",
          dark: "#115e59",
        },
        burn: "#c2410c",
      },
      boxShadow: {
        card: "0 1px 0 rgba(28, 25, 23, 0.06)",
      },
    },
  },
  plugins: [],
};
