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

  const { data: salonCitySlugs, error: citiesError } = await supabase
    .from("salons")
    .select("city_slug, updated_at")
    .not("city_slug", "is", null);

  const { count: citiesCount, error: countError } = await supabase
    .from("salons")
    .select("*", { count: "exact", head: true });

  if (citiesError) console.error("sitemap-cities: salons error", citiesError);
  if (countError) console.error("sitemap-cities: count error", countError);

  const seen = new Set<string>();

  const urls = (salonCitySlugs || [])
    .filter((row) => {
      if (!row?.city_slug) return false;
      if (seen.has(row.city_slug)) return false;
      seen.add(row.city_slug);
      return true;
    })
    .map((row) => `
    <url>
      <loc>https://duolb.com/directory/city/${row.city_slug}</loc>
      <lastmod>${formatSitemapLastmod(row.updated_at)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>
  `)
    .join("");

  const debugComment = debug
    ? `\n<!-- debug: citiesCount=${citiesCount ?? "null"} rows=${(salonCitySlugs || [])
        .length} -->\n`
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
