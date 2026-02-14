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

export async function GET({ request }: { request: Request }) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new Response("Supabase env missing", { status: 500 });
  }

  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  const { data: indexableRows, error: categoriesError } = await supabase
    .from("city_category_pages")
    .select("updated_at, cities!inner(index_state), business_categories!inner(slug)")
    .eq("is_indexable", true);

  if (categoriesError) {
    console.error("sitemap-categories: city_category_pages error", categoriesError);
  }

  const seen = new Set<string>();

  const urls = (indexableRows || [])
    .filter((row) => {
      const category = Array.isArray(row.business_categories)
        ? row.business_categories[0]
        : row.business_categories;
      const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
      if (city?.index_state !== true) return false;
      if (!category?.slug) return false;
      if (seen.has(category.slug)) return false;
      seen.add(category.slug);
      return true;
    })
    .map((row) => `
    <url>
      <loc>https://duolb.com/directory/category/${(Array.isArray(row.business_categories) ? row.business_categories[0] : row.business_categories).slug}</loc>
      <lastmod>${formatSitemapLastmod(row.updated_at)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>
  `)
    .join("");

  const debugComment = debug
    ? `\n<!-- debug: rows=${(indexableRows || []).length} uniqueSlugs=${seen.size} -->\n`
    : "\n";

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>${debugComment}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    }
    }
  );
}
