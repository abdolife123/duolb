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

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

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
    .eq("index_state", true)
    .not("slug", "is", null);

  if (citiesError) console.error("sitemap-cities: cities query error", citiesError);

  const seen = new Set<string>();
  const urls = (cities || [])
    .filter((row) => {
      if (!row?.slug || !String(row.slug).trim()) return false;
      if (seen.has(row.slug)) return false;
      seen.add(row.slug);
      return true;
    })
    .map((row) => `
    <url>
      <loc>https://duolb.com/directory/city/${xmlEscape(row.slug)}</loc>
      <lastmod>${formatSitemapLastmod(row.updated_at)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>
  `)
    .join("");

  const safeUrls =
    urls.trim().length > 0
      ? urls
      : `
    <url>
      <loc>https://duolb.com/directory/city</loc>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
  `;

  const debugComment = debug
    ? `\n<!-- debug: rows=${(cities || []).length} uniqueSlugs=${seen.size} -->\n`
    : "\n";

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>${debugComment}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${safeUrls}
</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
      }
    }
  );
}
