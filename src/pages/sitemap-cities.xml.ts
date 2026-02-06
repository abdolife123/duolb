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

  const { data: cities } = await supabase
    .from("cities")
    .select("slug, updated_at");

  const seen = new Set<string>();
  const urls = (cities || [])
    .filter((city) => {
      if (!city?.slug) return false;
      if (seen.has(city.slug)) return false;
      seen.add(city.slug);
      return true;
    })
    .map((city) => `
    <url>
      <loc>https://duolb.com/directory/city/${city.slug}</loc>
      <lastmod>${city.updated_at ?? new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>
  `)
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`,
    {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    }
    }
  );
}
