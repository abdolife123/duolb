import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { supabase as publicSupabase } from "../../lib/supabase";

type ReviewPayload = {
  salon_id?: string | number;
  salon_slug?: string;
  reviewer_name?: string;
  rating?: number;
  comment?: string;
};

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function normalizeIp(rawIp: string): string {
  if (!rawIp) return "127.0.0.1";

  let candidate = rawIp.trim();
  if (!candidate || candidate === "unknown" || candidate === "::1") return "127.0.0.1";

  // Keep only first address if multiple are present.
  if (candidate.includes(",")) candidate = candidate.split(",")[0].trim();

  // Remove square brackets around IPv6.
  candidate = candidate.replace(/^\[(.*)\]$/, "$1");

  // Strip IPv4 port suffix when present: 1.2.3.4:5678 -> 1.2.3.4
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.split(":")[0];
  }

  // Remove IPv6 zone id if present: fe80::1%lo0 -> fe80::1
  if (candidate.includes("%")) {
    candidate = candidate.split("%")[0];
  }

  const isValidIpv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(
    candidate
  );
  const isLikelyIpv6 = /^[0-9a-fA-F:]+$/.test(candidate) && candidate.includes(":");

  return isValidIpv4 || isLikelyIpv6 ? candidate : "127.0.0.1";
}

function getSlugFromReferer(referer: string | null): string {
  if (!referer) return "";

  try {
    const url = new URL(referer);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "salon") {
      return decodeURIComponent(parts[1] || "").trim();
    }
  } catch {
    return "";
  }

  return "";
}

function getServerSupabaseClient() {
  const supabaseUrl =
    import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  // Prefer service role for writes, but gracefully fall back to the app client.
  if (!supabaseUrl || !serviceRoleKey) return publicSupabase;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = getServerSupabaseClient();

    // Parse payload from client.
    const payload = (await request.json()) as ReviewPayload;

    let salonId = Number(payload.salon_id);
    const salonSlug =
      payload.salon_slug?.trim() || getSlugFromReferer(request.headers.get("referer"));
    const reviewerName = payload.reviewer_name?.trim() || "";
    const comment = payload.comment?.trim() || "";
    const rating = Number(payload.rating);

    // Resolve canonical numeric salon id from slug before insert.
    if (salonSlug) {
      const { data: salonRow, error: salonLookupError } = await supabase
        .from("salons")
        .select("id")
        .eq("slug", salonSlug)
        .maybeSingle();

      if (salonLookupError || !salonRow?.id) {
        console.error("Salon lookup error:", salonLookupError);
        return new Response(JSON.stringify({ error: "Invalid salon slug." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      salonId = Number(salonRow.id);
    }

    // Server-side validation to protect data quality.
    if (!Number.isInteger(salonId) || salonId <= 0) {
      return new Response(JSON.stringify({ error: "salon_id is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!reviewerName || !comment) {
      return new Response(
        JSON.stringify({ error: "reviewer_name and comment are required." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "rating must be 1 to 5." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // IP is derived from request headers only; never trust client-sent IP.
    const reviewerIp = normalizeIp(getClientIp(request));

    // Check existing review by same IP for this salon.
    const { data: existingReview, error: existingReviewError } = await supabase
      .from("salon_reviews")
      .select("id")
      .eq("salon_id", salonId)
      .eq("reviewer_ip", reviewerIp)
      .maybeSingle();

    if (existingReviewError) {
      console.error("Existing review lookup error:", existingReviewError);
      return new Response(
        JSON.stringify({ error: "Bewertung konnte nicht geprueft werden." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (existingReview?.id) {
      return new Response(
        JSON.stringify({
          error: "Du darfst pro Salon nur eine Bewertung abgeben.",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { error } = await supabase.from("salon_reviews").insert([
      {
        salon_id: salonId,
        reviewer_name: reviewerName,
        rating,
        comment,
        reviewer_ip: reviewerIp,
        approved: false,
      },
    ]);

    if (error) {
      console.error("Review insert error:", error);
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "Du darfst pro Salon nur eine Bewertung abgeben.",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        JSON.stringify({
          error: error.message || "Failed to save review.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Review submitted and awaiting approval.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Review API error:", error);

    return new Response(JSON.stringify({ error: "Invalid request." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};

