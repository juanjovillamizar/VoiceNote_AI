/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          350: "#818cf8",
        },
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        wave: {
          "0%, 100%": { height: "5px" },
          "50%":       { height: "20px" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition:  "700px 0" },
        },
        "ping-slow": {
          "0%":   { transform: "scale(1)",   opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0"   },
        },
        "pulse-ring": {
          "0%":   { boxShadow: "0 0 0 0px rgba(99,102,241,0.5)"  },
          "100%": { boxShadow: "0 0 0 12px rgba(99,102,241,0)"   },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to:   { opacity: "1", transform: "translateY(0)"    },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.3s ease-out forwards",
        "fade-in-scale": "fade-in-scale 0.25s ease-out forwards",
        "slide-up":      "slide-up 0.3s ease-out forwards",
        "slide-down":    "slide-down 0.25s ease-out forwards",
        wave:            "wave 0.9s ease-in-out infinite",
        shimmer:         "shimmer 1.5s infinite linear",
        "ping-slow":     "ping-slow 1.3s ease-out infinite",
        "pulse-ring":    "pulse-ring 1.2s ease-out infinite",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        "indigo-md": "0 4px 24px -4px rgba(99,102,241,0.35)",
        "violet-md": "0 4px 24px -4px rgba(124,58,237,0.30)",
        "glow":      "0 0 20px rgba(99,102,241,0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};