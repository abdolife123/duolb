import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'

export default defineConfig({
  site: 'https://duolb.com',

  output: 'server',        // REQUIRED
  adapter: cloudflare({    // Worker adapter
    mode: 'standalone'
  }),

  integrations: [
    mdx(),
    sitemap(),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
})
