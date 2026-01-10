/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Semantic colors that adapt to theme
        // Use these in components for automatic theme switching
        bg: {
          primary: '#ffffff',      // Main background (light: white, dark: #2c2c2c)
          secondary: '#EEEEEE',    // Secondary background (light: #EEEEEE, dark: #3A3A3A)
          elevated: '#D7D7D7',     // Elevated elements (light: #D7D7D7, dark: #454545)
        },
        border: {
          primary: '#B8B8B8',      // Main border (light: #B8B8B8, dark: #3A3A3A)
          secondary: '#E0E0E0',    // Secondary border
        },
        text: {
          primary: '#313131',      // Primary text (light: #313131, dark: #E8E8E8)
          secondary: '#656565',    // Secondary text (light: #656565, dark: #909090)
          muted: '#8C8C8C',        // Muted text
        },
        // Accent colors (same in both themes)
        accent: {
          primary: '#C9A86B',      // Gold accent
          secondary: '#3A3A3A',    // Dark accent
        },
        // Status colors (same in both themes)
        status: {
          success: '#40882C',      // Green
          error: '#EE505A',        // Red
          warning: '#FFA500',      // Orange
          platon: '#EE505A',       // Platon red
        },
        // Theme-specific colors for manual use
        light: {
          bg: '#ffffff',
          surface: '#EEEEEE',
          elevated: '#D7D7D7',
          border: '#B8B8B8',
          text: '#313131',
          textSecondary: '#656565',
        },
        dark: {
          bg: '#2c2c2c',
          surface: '#3A3A3A',
          elevated: '#454545',
          border: '#3A3A3A',
          text: '#E8E8E8',
          textSecondary: '#909090',
        },
      },
    },
  },
  plugins: [],
}

