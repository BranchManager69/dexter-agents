import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#070910",
        foreground: "#E6EDF7",
        surface: {
          base: "#0E1420",
          raised: "#111B2B",
          glass: "#18253A",
        },
        flux: "#5BFFBA",
        iris: "#7C5CFF",
        accent: {
          info: "#45B3FF",
          success: "#38F2B8",
          warn: "#FFC66B",
          critical: "#FF597D",
        },
        neutral: {
          100: "#E6EDF7",
          200: "#C7D3E5",
          300: "#A9B8CF",
          400: "#94A6C2",
          500: "#7A8CA3",
          600: "#5A6B82",
          700: "#3F4E63",
          800: "#243449",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "sans-serif"],
        body: ["IBM Plex Sans", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "12px",
        lg: "20px",
        pill: "999px",
      },
      boxShadow: {
        elevated: "0 24px 60px rgba(13, 23, 46, 0.45)",
        "glow-flux": "0 0 20px rgba(91, 255, 186, 0.45)",
        "glow-iris": "0 0 20px rgba(124, 92, 255, 0.45)",
      },
      transitionDuration: {
        swift: "120ms",
        default: "200ms",
        modal: "360ms",
      },
      spacing: {
        1.5: "4px",
        2.5: "10px",
        3.5: "14px",
        7.5: "30px",
        9: "72px",
        11: "88px",
      },
    },
  },
  plugins: [],
} satisfies Config;
