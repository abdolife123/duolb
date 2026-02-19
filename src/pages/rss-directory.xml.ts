import { supabase } from "../lib/supabase";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const pageSize = 1000;
  const salons: Array<{
    salon_name: string | null;
    slug: string | null;
    full_address: string | null;
    updated_at: string | null;
    created_at: string | null;
  }> = [];

  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("salons")
      .select("salon_name, slug, full_address, updated_at, created_at")
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(error);
      break;
    }

    const batch = data || [];
    salons.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  const items = salons
    .filter((salon) => typeof salon.slug === "string" && salon.slug.trim().length > 0)
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
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
