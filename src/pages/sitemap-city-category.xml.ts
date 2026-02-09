import { createClient } from "@supabase/supabase-js";

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

  const [{ data: cities }, { data: categories }, { data: salons }] =
    await Promise.all([
      supabase.from("cities").select("slug"),
      supabase.from("business_categories").select("slug"),
      supabase
        .from("salons")
        .select("city_slug, category_slug")
        .not("city_slug", "is", null)
        .not("category_slug", "is", null),
    ]);

  let urls = "";
  const seen = new Set<string>();
  const citySet = new Set((cities || []).map((c) => c.slug).filter(Boolean));
  const categorySet = new Set(
    (categories || []).map((c) => c.slug).filter(Boolean)
  );
  const salonPairs = new Set(
    (salons || [])
      .map((s) => `${s.city_slug}/${s.category_slug}`)
      .filter((key) => {
        const [citySlug, categorySlug] = key.split("/");
        return citySet.has(citySlug) && categorySet.has(categorySlug);
      })
  );

  for (const key of salonPairs) {
    if (seen.has(key)) continue;
    seen.add(key);
    const [citySlug, categorySlug] = key.split("/");
    urls += `
    <url>
      <loc>https://duolb.com/directory/city/${citySlug}/${categorySlug}</loc>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
  `;
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
