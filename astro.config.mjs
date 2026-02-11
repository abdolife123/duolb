import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// NOTE:
// @astrojs/cloudflare pulls in wrangler, which may spawn subprocesses at import-time.
// Use dynamic imports so local builds can run with the Node adapter without loading wrangler.

const isDev = process.env.NODE_ENV === 'development'

const adapter = isDev
  ? (await import('@astrojs/node')).default({ mode: 'standalone' })
  : (await import('@astrojs/cloudflare')).default({ sessions: false })

export default defineConfig({
  site: 'https://duolb.com',
  output: 'server',
  build: {
    inlineStylesheets: "always",
  },

  // Use Node locally, Cloudflare in production
  adapter,

  integrations: [
    mdx(),
    sitemap(),
    react(),
  ],

  vite: {
    // Avoid writing cache into the project folder (can be locked by OneDrive/AV on Windows).
    cacheDir: join(tmpdir(), 'duolb-vite'),
    plugins: [tailwindcss()],
  },
})
