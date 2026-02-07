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

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new Response("Supabase env missing", { status: 500 });
  }

  const [
    { data: cities },
    { data: categories },
    { data: salons, error: salonsError },
  ] = await Promise.all([
    supabase.from("cities").select("name, slug"),
    supabase.from("business_categories").select("name, slug"),
    supabase
      .from("salons")
      .select("city_slug, category_slug")
      .not("city_slug", "is", null)
      .not("category_slug", "is", null),
  ]);

  if (salonsError) {
    console.error(salonsError);
  }

  const cityMap = new Map(
    (cities || []).map((city) => [city.slug, city.name])
  );
  const categoryMap = new Map(
    (categories || []).map((category) => [category.slug, category.name])
  );

  const comboMap = new Map<
    string,
    { count: number; cityName: string; citySlug: string; categoryName: string; categorySlug: string }
  >();

  for (const row of salons || []) {
    const citySlug = row.city_slug;
    const categorySlug = row.category_slug;
    if (!citySlug || !categorySlug) continue;

    const cityName = cityMap.get(citySlug);
    const categoryName = categoryMap.get(categorySlug);
    if (!cityName || !categoryName) continue;

    const key = `${citySlug}__${categorySlug}`;
    const existing = comboMap.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      comboMap.set(key, {
        count: 1,
        cityName,
        citySlug,
        categoryName,
        categorySlug,
      });
    }
  }

  const itemsData = Array.from(comboMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 500);

  const pubDate = new Date().toUTCString();

  const items = itemsData
    .map((item) => {
      const title = escapeXml(`${item.categoryName} in ${item.cityName}`);
      const link = `https://duolb.com/directory/city/${item.citySlug}/${item.categorySlug}`;
      const description = escapeXml(
        `Find the best ${item.categoryName} salons in ${item.cityName}, Germany. Compare ratings, services and locations.`
      );

      return `
        <item>
          <title>${title}</title>
          <link>${link}</link>
          <description>${description}</description>
          <pubDate>${pubDate}</pubDate>
        </item>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml("Duolb City & Category Beauty Listings")}</title>
    <link>https://duolb.com/directory</link>
    <description>${escapeXml("Browse beauty and wellness services by city and category across Germany.")}</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
