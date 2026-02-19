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

  const pageSize = 1000;

  const categories: Array<{ name: string | null; slug: string | null }> = [];
  let categoriesFrom = 0;
  while (true) {
    const { data, error } = await supabase
      .from("business_categories")
      .select("name, slug")
      .order("name")
      .range(categoriesFrom, categoriesFrom + pageSize - 1);

    if (error) {
      console.error(error);
      break;
    }

    const batch = data || [];
    categories.push(...batch);
    if (batch.length < pageSize) break;
    categoriesFrom += pageSize;
  }

  const salonCategories: Array<{ category_slug: string | null }> = [];
  let salonsFrom = 0;
  while (true) {
    const { data, error } = await supabase
      .from("salons")
      .select("category_slug")
      .not("category_slug", "is", null)
      .range(salonsFrom, salonsFrom + pageSize - 1);

    if (error) {
      console.error(error);
      break;
    }

    const batch = data || [];
    salonCategories.push(...batch);
    if (batch.length < pageSize) break;
    salonsFrom += pageSize;
  }

  const pubDate = new Date().toUTCString();
  const categorySet = new Set(
    salonCategories.map((row) => row.category_slug).filter(Boolean)
  );

  const items = categories
    .filter((category) => categorySet.size === 0 || categorySet.has(category.slug))
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
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
