import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16312d",
        cream: "#f7f3e9",
        sea: "#0d8b73",
        coral: "#ef765f",
        mist: "#dcece7",
        sun: "#f2c95f"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(22, 49, 45, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
