/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Aksen KPP (TECH_DESIGN §11): hijau + biru.
        kpp: {
          green: "#0B7A3B",
          blue: "#0E4D92",
        },
      },
    },
  },
  plugins: [],
};
