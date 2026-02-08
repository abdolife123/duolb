/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#C9AE84",
          cream: "#F6F4F1",
          rose: "#C98FA0",
          sage: "#A8B8A2",
          mocha: "#A47864",
          berry: "#7D425B",
          pure: "#FFFFFF",
        },
      },
      borderRadius: {
        xl2: "1.5rem",
        xl3: "2rem",
      },
      // This styles the 'prose' class to use your brand colors
      typography: (theme) => ({
        brand: {
          css: {
            '--tw-prose-headings': theme('colors.brand.gold'),
            '--tw-prose-links': theme('colors.brand.gold'),
            '--tw-prose-bullets': theme('colors.brand.gold'),
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
