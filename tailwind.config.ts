import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c2430",
        mist: "#f5f7fb",
        line: "#d8dfeb",
        moss: "#50746a",
        coral: "#be5c49"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(28, 36, 48, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
