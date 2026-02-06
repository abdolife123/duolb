import { supabase } from "../lib/supabase";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const { data: categories, error } = await supabase
    .from("categories")
    .select("name, slug")
    .order("name");

  if (error) {
    console.error(error);
  }

  const pubDate = new Date().toUTCString();

  const items = (categories || [])
    .map((category) => {
      const title = escapeXml(category.name ?? "Category");
      const link = `https://duolb.com/directory/category/${category.slug}`;
      const description = escapeXml(
        `Find the best ${category.name} salons in Germany`
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
    <title>Duolb Beauty Categories</title>
    <link>https://duolb.com/directory</link>
    <description>Explore beauty and wellness services by category across Germany.</description>
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
