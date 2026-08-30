/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        md: {
          background: '#F7F8FC',             // Page background
          'on-surface': '#171A2B',           // Primary text
          primary: '#4F46E5',                // Primary / CTA
          'primary-hover': '#4338CA',        // Primary hover
          'on-primary': '#FFFFFF',
          'secondary-container': '#EEF2FF',  // Chart fill / Light container
          'on-secondary-container': '#4F46E5',
          tertiary: '#6366F1',               // Accent
          'surface-container': '#FFFFFF',    // Cards
          'surface-container-low': '#F7F8FC',// recessed inputs
          outline: '#E5E7EB',                // Border
          'on-surface-variant': '#667085',   // Secondary text
          healthy: '#16A34A',
          warning: '#D97706',
          error: '#DC2626'
        }
      },
      transitionTimingFunction: {
        'md-emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      borderRadius: {
        'md-xs': '8px',
        'md-sm': '12px',
        'md-md': '16px',
        'md-lg': '24px',
        'md-xl': '28px',
        'md-xxl': '32px',
      }
    },
  },
  plugins: [],
}
