import { supabase } from "../lib/supabase";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const { data: salons, error } = await supabase
    .from("salons")
    .select("city_id, category_id, cities(name, slug), categories(name, slug)");

  if (error) {
    console.error(error);
  }

  const comboMap = new Map<
    string,
    { count: number; cityName: string; citySlug: string; categoryName: string; categorySlug: string }
  >();

  for (const row of salons || []) {
    const city = (row as any).cities;
    const category = (row as any).categories;
    if (!city || !category) continue;

    const key = `${city.slug}__${category.slug}`;
    const existing = comboMap.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      comboMap.set(key, {
        count: 1,
        cityName: city.name,
        citySlug: city.slug,
        categoryName: category.name,
        categorySlug: category.slug,
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
