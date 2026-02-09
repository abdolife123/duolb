export async function GET() {
  const urls = [
    "https://duolb.com/sitemap-blog.xml",
    "https://duolb.com/sitemap-salons.xml",
    "https://duolb.com/sitemap-directory.xml",
    "https://duolb.com/sitemap-city-category.xml",
    "https://duolb.com/sitemap-cities.xml",
    "https://duolb.com/sitemap-categories.xml",
  ]
    .map(
      (loc) => `
  <sitemap>
    <loc>${loc}</loc>
  </sitemap>`
    )
    .join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</sitemapindex>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
