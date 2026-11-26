/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#09090B",
        panel: "#121216",
        panelHover: "#18181E",
        violetAccent: "#8B5CF6",
        cyanAccent: "#06B6D4",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        glowViolet: "0 0 24px rgba(139, 92, 246, 0.25)",
        glowCyan: "0 0 24px rgba(6, 182, 212, 0.22)",
        glass: "0 20px 50px rgba(0, 0, 0, 0.55)",
      },
    },
  },
  plugins: [],
};
