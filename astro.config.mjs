import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import cloudflare from '@astrojs/cloudflare'
import node from '@astrojs/node'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  site: 'https://duolb.com',
  output: 'server',

  // Use Node locally, Cloudflare in production
  adapter: isDev
    ? node({ mode: 'standalone' })
    : cloudflare({ sessions: false}),

  integrations: [
    mdx(),
    sitemap(),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
})
