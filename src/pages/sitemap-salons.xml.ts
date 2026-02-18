import { supabase } from "../lib/supabase";
import { formatSitemapLastmod } from "../lib/sitemapLastmod";

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const { data: salons } = await supabase
    .from("salons")
    .select("slug, updated_at")
    .not("slug", "is", null);

  const urls = (salons || [])
    .filter((salon) => typeof salon.slug === "string" && salon.slug.trim().length > 0)
    .map((salon) => `
    <url>
      <loc>https://duolb.com/salon/${xmlEscape(salon.slug)}</loc>
      <lastmod>${formatSitemapLastmod(salon.updated_at)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>
  `)
    .join("");

  const safeUrls =
    urls.trim().length > 0
      ? urls
      : `
    <url>
      <loc>https://duolb.com/salons</loc>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
  `;

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${safeUrls}
    </urlset>`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
