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

  const { data: salonCategorySlugs, error: categoriesError } = await supabase
    .from("salons")
    .select("category_slug, updated_at")
    .not("category_slug", "is", null);

  const { count: categoriesCount, error: countError } = await supabase
    .from("salons")
    .select("*", { count: "exact", head: true });

  if (categoriesError) {
    console.error("sitemap-categories: salons error", categoriesError);
  }
  if (countError) {
    console.error("sitemap-categories: count error", countError);
  }

  const seen = new Set<string>();

  const urls = (salonCategorySlugs || [])
    .filter((row) => {
      if (!row?.category_slug) return false;
      if (seen.has(row.category_slug)) return false;
      seen.add(row.category_slug);
      return true;
    })
    .map((row) => `
    <url>
      <loc>https://duolb.com/directory/category/${row.category_slug}</loc>
      <lastmod>${row.updated_at ?? new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.9</priority>
    </url>
  `)
    .join("");

  const debugComment = debug
    ? `\n<!-- debug: categoriesCount=${categoriesCount ?? "null"} rows=${(categories || [])
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
