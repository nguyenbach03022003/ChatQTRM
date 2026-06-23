/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1016",
        panel: "#111822",
        edge: "#213043",
        accent: "#61e6b5",
        accentSoft: "#1f7a61",
        ember: "#f6b26b",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(0, 0, 0, 0.35)",
      },
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        haze:
          "radial-gradient(circle at top left, rgba(97, 230, 181, 0.14), transparent 38%), radial-gradient(circle at top right, rgba(246, 178, 107, 0.1), transparent 28%), linear-gradient(180deg, #091018 0%, #0b1016 100%)",
      },
    },
  },
  plugins: [],
};
