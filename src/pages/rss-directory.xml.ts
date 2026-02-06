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
    .select("salon_name, slug, full_address, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error(error);
  }

  const items = (salons || [])
    .map((salon) => {
      const title = escapeXml(salon.salon_name ?? "Salon");
      const link = `https://duolb.com/salon/${salon.slug}`;
      const address = (salon.full_address ?? "").trim();
      const description = escapeXml(
        `${address ? `${address} - ` : ""}Beauty & Wellness Salon in Germany`
      );
      const rawDate = salon.updated_at || salon.created_at || new Date().toISOString();
      const pubDate = new Date(rawDate).toUTCString();

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
    <title>${escapeXml("Duolb Beauty & Wellness Salons")}</title>
    <link>https://duolb.com/directory</link>
    <description>${escapeXml("Latest beauty and wellness salons across Germany.")}</description>
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
