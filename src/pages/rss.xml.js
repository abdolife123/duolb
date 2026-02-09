import { supabase } from "../lib/supabase";

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("title, slug, description, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error(error);
  }

  const pubDateFallback = new Date().toUTCString();

  const items = (posts || [])
    .map((post) => {
      const title = escapeXml(post.title ?? "Post");
      const link = `https://duolb.com/posts/${post.slug}`;
      const description = escapeXml(post.description ?? "");
      const rawDate = post.created_at ? new Date(post.created_at).toUTCString() : pubDateFallback;

      return `
        <item>
          <title>${title}</title>
          <link>${link}</link>
          <description>${description}</description>
          <pubDate>${rawDate}</pubDate>
        </item>
      `;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>duolb - Beauty Blog</title>
    <link>https://duolb.com</link>
    <description>Beauty, Hautpflege, Trends und ehrliche Produktempfehlungen.</description>
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
