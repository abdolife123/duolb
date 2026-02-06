import { supabase } from "../lib/supabase";

export async function GET() {
  const [{ data: cities }, { data: categories }] = await Promise.all([
    supabase.from("cities").select("slug"),
    supabase.from("categories").select("slug")
  ]);

  let urls = "";

  for (const city of cities || []) {
    for (const cat of categories || []) {
      urls += `
        <url>
          <loc>https://duolb.com/directory/city/${city.slug}/${cat.slug}</loc>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>
      `;
    }
  }

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
