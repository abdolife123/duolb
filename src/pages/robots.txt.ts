export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /_astro/
Disallow: /*?*
Disallow: /directory/city/*/*?*

Sitemap: https://duolb.com/sitemap-index.xml
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
