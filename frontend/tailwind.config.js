/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: withOpacity("--c-bg"),
        surface: withOpacity("--c-surface"),
        "surface-2": withOpacity("--c-surface-2"),
        "surface-3": withOpacity("--c-surface-3"),
        border: withOpacity("--c-border"),
        "border-strong": withOpacity("--c-border-strong"),
        content: withOpacity("--c-text"),
        muted: withOpacity("--c-text-muted"),
        subtle: withOpacity("--c-text-subtle"),
        accent: withOpacity("--c-accent"),
        "accent-hover": withOpacity("--c-accent-hover"),
        "accent-fg": withOpacity("--c-accent-fg"),
        "accent-soft": withOpacity("--c-accent-soft"),
        ember: withOpacity("--c-ember"),
        danger: withOpacity("--c-danger"),
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        soft: "var(--shadow-soft)",
        glow: "0 0 0 1px rgb(var(--c-accent) / 0.35), 0 8px 30px rgb(var(--c-accent) / 0.12)",
      },
      fontFamily: {
        sans: ["Space Grotesk", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        haze: "var(--bg-haze)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.25s ease-out",
        "pulse-dot": "pulse-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
