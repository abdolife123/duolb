import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

type SalonFeedRow = {
  salon_name: string | null;
  slug: string | null;
  city_slug: string | null;
  description: string | null;
  created_at: string | null;
};

const SITE_URL = "https://duolb.com";

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

export async function getSalonsByCategory(
  categorySlug: string
): Promise<SalonFeedRow[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase env missing");
  }

  const { data, error } = await supabase
    .from("salons")
    .select("salon_name, slug, city_slug, description, created_at")
    .eq("category_slug", categorySlug)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SalonFeedRow[];
}

export const GET: APIRoute = async ({ params }) => {
  const categorySlug = (params.category ?? "").trim().toLowerCase();

  if (!categorySlug) {
    return new Response("Category is required", { status: 400 });
  }

  try {
    const salons = await getSalonsByCategory(categorySlug);

    const feedResponse = await rss({
      title: `Salons in ${categorySlug}`,
      description: `Newest salons in the ${categorySlug} category.`,
      site: SITE_URL,
      items: salons
        .filter((salon) => Boolean(salon.slug))
        .map((salon) => ({
          title: salon.salon_name?.trim() || "Salon",
          description:
            salon.city_slug?.trim() ||
            salon.description?.trim() ||
            "Beauty salon listing",
          link: `/salon/${salon.slug}`,
          pubDate: salon.created_at ? new Date(salon.created_at) : new Date(),
        })),
    });

    feedResponse.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400"
    );

    return feedResponse;
  } catch (error) {
    console.error("Category feed error:", error);
    return new Response("Failed to generate feed", { status: 500 });
  }
};

