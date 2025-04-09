/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'tech-grid': 'linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)',
      },
      colors: {
        'tech-blue': '#38bdf8',
        'tech-dark': '#0a0f1e',
        'tech-darker': '#050a14',
        'tech-gray': '#9ca3af',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'neon': '0 0 5px rgba(56, 189, 248, 0.5), 0 0 10px rgba(56, 189, 248, 0.3)',
        'neon-hover': '0 0 10px rgba(56, 189, 248, 0.8), 0 0 20px rgba(56, 189, 248, 0.5)',
      },
    },
  },
  plugins: [],
}