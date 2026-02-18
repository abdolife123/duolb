import { createClient } from "@supabase/supabase-js";
import { formatSitemapLastmod } from "../lib/sitemapLastmod";

const supabaseUrl =
  import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new Response("Supabase env missing", { status: 500 });
  }

  const { data: pages } = await supabase
    .from("city_category_pages")
    .select("updated_at, cities!inner(slug, index_state), business_categories!inner(slug)")
    .eq("is_indexable", true);

  const seen = new Set<string>();
  const urls = (pages || [])
    .map((row) => {
      const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
      const category = Array.isArray(row.business_categories)
        ? row.business_categories[0]
        : row.business_categories;

      if (!city?.slug || !category?.slug) return null;
      if (city.index_state !== true) return null;

      const key = `${city.slug}/${category.slug}`;
      if (seen.has(key)) return null;
      seen.add(key);

      return `
    <url>
      <loc>https://duolb.com/directory/city/${city.slug}/${category.slug}</loc>
      <lastmod>${formatSitemapLastmod(row.updated_at)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
  `;
    })
    .filter(Boolean)
    .join("");

  const safeUrls =
    urls.trim().length > 0
      ? urls
      : `
    <url>
      <loc>https://duolb.com/directory/city</loc>
      <changefreq>weekly</changefreq>
      <priority>0.6</priority>
    </url>
  `;

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${safeUrls}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
