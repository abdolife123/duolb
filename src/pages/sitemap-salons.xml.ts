import { supabase } from "../lib/supabase";

export async function GET() {
  const { data: salons } = await supabase
    .from("salons")
    .select("slug, updated_at");

  const urls = (salons || []).map((salon) => `
    <url>
      <loc>https://duolb.com/salon/${salon.slug}</loc>
      <lastmod>${salon.updated_at ?? new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
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
