import { supabase } from "../lib/supabase";
import { formatSitemapLastmod } from "../lib/sitemapLastmod";

export async function GET() {
  const base = "https://duolb.com";

  const [{ data: cities }, { data: categories }, { data: salons }] = await Promise.all([
    supabase.from("cities").select("slug, updated_at"),
    supabase.from("business_categories").select("slug, updated_at"),
    supabase.from("salons").select("slug, updated_at")
  ]);

  let urls = "";

  // City pages
  for (const city of cities || []) {
    urls += `
      <url>
        <loc>${base}/directory/city/${city.slug}</loc>
        <lastmod>${formatSitemapLastmod(city.updated_at)}</lastmod>
        <priority>0.9</priority>
      </url>`;
  }

  // Category pages
  for (const cat of categories || []) {
    urls += `
      <url>
        <loc>${base}/directory/category/${cat.slug}</loc>
        <lastmod>${formatSitemapLastmod(cat.updated_at)}</lastmod>
        <priority>0.9</priority>
      </url>`;
  }

  // Salon pages
  for (const salon of salons || []) {
    urls += `
      <url>
        <loc>${base}/salon/${salon.slug}</loc>
        <lastmod>${formatSitemapLastmod(salon.updated_at)}</lastmod>
        <priority>0.8</priority>
      </url>`;
  }

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
