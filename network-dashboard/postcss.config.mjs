const config = {
  plugins: ["@tailwindcss/postcss"],
};

const flowbite = require("flowbite-react/tailwind");

// @type {import('tailwindcss').Config} 
module.exports = {
  content: [
    // ...
    flowbite.content(),
  ],
  plugins: [
    // ...
    flowbite.plugin(),
  ],
};

export default config;
