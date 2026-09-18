/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        primaryLight: "#60A5FA",
        peach: "#FDBA74",
        background: "#F8FAFC",
        surface: "#FFFFFF",
        textPrimary: "#111827",
        textSecondary: "#64748B",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
