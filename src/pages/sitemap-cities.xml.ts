import { supabase } from "../lib/supabase";

export async function GET() {
  const { data: cities } = await supabase
    .from("cities")
    .select("slug, updated_at");

  const urls = (cities || []).map((city) => `
    <url>
      <loc>https://duolb.com/directory/city/${city.slug}</loc>
      <lastmod>${city.updated_at ?? new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>
  `).join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
