import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables missing");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OWNER_SECRET = "my_owner_key_9f3c7a1b";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.text();
    const data = JSON.parse(body);

    // 🧑‍💻 1. Ignore yourself
    if (data.ownerKey === OWNER_SECRET) {
      return new Response(null, { status: 204 });
    }

    // 🌐 2. Ignore localhost & preview domain
    const host = request.headers.get("host") || "";
    const referrer = (data.referrer || "").toLowerCase();

    const isDevHost =
      host.includes("localhost") ||
      host.includes("127.0.0.1") ||
      host.includes("duolb.pages.dev");

    const isDevReferrer =
      referrer.includes("localhost") ||
      referrer.includes("127.0.0.1") ||
      referrer.includes("duolb.pages.dev");

    if (isDevHost || isDevReferrer) {
      return new Response(null, { status: 204 });
    }

    // 🤖 3. Bot filter
    const ua = (data.userAgent || "").toLowerCase();
    const isBot =
      ua.includes("bot") ||
      ua.includes("crawl") ||
      ua.includes("spider") ||
      ua.includes("preview") ||
      ua.includes("facebookexternalhit") ||
      ua.includes("whatsapp") ||
      ua.includes("slackbot") ||
      ua.includes("telegrambot");

    if (isBot) {
      return new Response(null, { status: 204 });
    }

    // 💾 4. Store real human traffic
    const { error } = await supabase.from("analytics_events").insert({
      event_name: data.event || "pageview",
      path: data.path,
      referrer: data.referrer,
      user_agent: data.userAgent,
      session_id: data.sessionId
    });

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Tracking error:", err);
    return new Response("Tracking failed", { status: 500 });
  }
};
