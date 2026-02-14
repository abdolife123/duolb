import { supabase } from "../lib/supabase";
import { formatSitemapLastmod } from "../lib/sitemapLastmod";

export async function GET() {
  const base = "https://duolb.com";

  const [{ data: cities }, { data: indexableCategoryPages }, { data: salons }] = await Promise.all([
    supabase.from("cities").select("slug, updated_at").eq("index_state", true).not("slug", "is", null),
    supabase
      .from("city_category_pages")
      .select("updated_at, business_categories!inner(slug), cities!inner(index_state)")
      .eq("is_indexable", true),
    supabase.from("salons").select("slug, updated_at").not("slug", "is", null)
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

  // Category pages (only categories that have at least one indexable city-category row in indexable city)
  const seenCategories = new Set<string>();
  const categories = (indexableCategoryPages || [])
    .map((row) => {
      const category = Array.isArray(row.business_categories)
        ? row.business_categories[0]
        : row.business_categories;
      const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
      if (!category?.slug || city?.index_state !== true) return null;
      return { slug: category.slug, updated_at: row.updated_at };
    })
    .filter(Boolean);

  for (const cat of categories || []) {
    if (!cat?.slug || seenCategories.has(cat.slug)) continue;
    seenCategories.add(cat.slug);
    urls += `
      <url>
        <loc>${base}/directory/category/${cat.slug}</loc>
        <lastmod>${formatSitemapLastmod(cat.updated_at)}</lastmod>
        <priority>0.9</priority>
      </url>`;
  }

  // Salon pages
  for (const salon of salons || []) {
    if (!salon?.slug || !String(salon.slug).trim()) continue;
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
