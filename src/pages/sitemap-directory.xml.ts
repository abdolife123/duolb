import { supabase } from "../lib/supabase";

export async function GET() {
  const base = "https://duolb.de";

  const [{ data: cities }, { data: categories }, { data: salons }] = await Promise.all([
    supabase.from("cities").select("slug, updated_at"),
    supabase.from("categories").select("slug, updated_at"),
    supabase.from("salons").select("slug, updated_at")
  ]);

  let urls = "";

  // City pages
  for (const city of cities || []) {
    urls += `
      <url>
        <loc>${base}/directory/city/${city.slug}</loc>
        <lastmod>${city.updated_at ?? new Date().toISOString()}</lastmod>
        <priority>0.9</priority>
      </url>`;
  }

  // Category pages
  for (const cat of categories || []) {
    urls += `
      <url>
        <loc>${base}/directory/category/${cat.slug}</loc>
        <lastmod>${cat.updated_at ?? new Date().toISOString()}</lastmod>
        <priority>0.9</priority>
      </url>`;
  }

  // Salon pages
  for (const salon of salons || []) {
    urls += `
      <url>
        <loc>${base}/salon/${salon.slug}</loc>
        <lastmod>${salon.updated_at ?? new Date().toISOString()}</lastmod>
        <priority>0.8</priority>
      </url>`;
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
