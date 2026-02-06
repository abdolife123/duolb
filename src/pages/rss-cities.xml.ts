import { supabase } from "../lib/supabase";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const { data: cities, error } = await supabase
    .from("cities")
    .select("name, slug, salon_count")
    .gt("salon_count", 0)
    .order("salon_count", { ascending: false })
    .limit(200);

  if (error) {
    console.error(error);
  }

  const pubDate = new Date().toUTCString();

  const items = (cities || [])
    .map((city) => {
      const title = escapeXml(city.name ?? "City");
      const link = `https://duolb.com/directory/city/${city.slug}`;
      const description = escapeXml(
        `Beauty & Wellness Salons in ${city.name}, Germany`
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
    <title>Duolb Cities – Beauty Directory</title>
    <link>https://duolb.com/directory</link>
    <description>Browse beauty and wellness salons by city across Germany.</description>
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
