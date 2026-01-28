/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    gold: "#958e09",
                    cream: "#ffdead",
                    pure: "#FFFFFF",
                },
            },
            borderRadius: {
                xl2: "1.5rem",
                xl3: "2rem",
            },
        },
    },
    plugins: [],
};
