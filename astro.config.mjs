import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'

export default defineConfig({
  site: 'https://duolb.com',
  output: 'server',
  adapter: cloudflare(
    {
    platformProxy: {
      enabled: true
    }
  }
  ),   // ⭐ THIS IS REQUIRED
  integrations: [mdx(), sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
  },
})

