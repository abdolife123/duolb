export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /nekaya

Sitemap: https://duolb.com/sitemap-index.xml
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
