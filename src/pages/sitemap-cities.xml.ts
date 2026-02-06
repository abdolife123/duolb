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

export async function GET({ request }: { request: Request }) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new Response("Supabase env missing", { status: 500 });
  }

  const url = new URL(request.url);
  const debug = url.searchParams.get("debug") === "1";

  const { data: cities, error: citiesError } = await supabase
    .from("cities")
    .select("slug, updated_at")
    .not("slug", "is", null);

  const { count: citiesCount, error: countError } = await supabase
    .from("cities")
    .select("*", { count: "exact", head: true });

  if (citiesError) console.error("sitemap-cities: cities error", citiesError);
  if (countError) console.error("sitemap-cities: count error", countError);

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

  const debugComment = debug
    ? `\n<!-- debug: citiesCount=${citiesCount ?? "null"} rows=${(cities || [])
        .length} -->\n`
    : "\n";

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>${debugComment}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
