import type { Config } from "tailwindcss";


const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This scans all files in src
  ],
  theme: {
    extend: {
      // You can add your custom HUD colors here later
    },
  },
  plugins: [],
};
export default config;