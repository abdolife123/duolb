import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Configuration
// ============================================================================

const supabaseUrl =
  import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const OWNER_SECRET = import.meta.env.OWNER_SECRET || "my_owner_key_9f3c7a1b";

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

// ============================================================================
// Types
// ============================================================================

interface TrackingPayload {
  event?: string;
  path?: string;
  referrer?: string;
  userAgent?: string;
  sessionId?: string;
  ownerKey?: string;
  timestamp?: number;
  screenWidth?: number;
  screenHeight?: number;
  language?: string;
  timezone?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// ============================================================================
// Constants
// ============================================================================

const BOT_PATTERNS = [
  "bot",
  "crawl",
  "spider",
  "preview",
  "facebookexternalhit",
  "whatsapp",
  "slackbot",
  "telegrambot",
  "googlebot",
  "bingbot",
  "yandexbot",
  "baiduspider",
  "ahrefsbot",
  "semrushbot",
  "duckduckbot",
  "applebot",
  "petalbot",
  "twitterbot",
  "linkedinbot",
  "discordbot",
  "slurp",
  "msnbot",
  "ia_archiver",
  "headless",
  "phantom",
  "selenium",
  "puppeteer",
  "playwright",
];

const DEV_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "duolb.pages.dev",
  ".local",
  "192.168.",
  "10.0.",
];

const SUSPICIOUS_PATTERNS = [
  "curl",
  "wget",
  "python-requests",
  "postman",
  "insomnia",
  "httpie",
];

// Rate limiting: Simple in-memory store (consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user agent is a bot
 */
function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}

/**
 * Check if host/referrer is from development environment
 */
function isDevEnvironment(host: string, referrer: string): boolean {
  const combined = `${host} ${referrer}`.toLowerCase();
  return DEV_DOMAINS.some((domain) => combined.includes(domain));
}

/**
 * Check if user agent looks suspicious
 */
function isSuspicious(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return SUSPICIOUS_PATTERNS.some((pattern) => ua.includes(pattern));
}

/**
 * Validate session ID format
 */
function isValidSessionId(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  // Session ID should be a reasonable length and alphanumeric
  return /^[a-zA-Z0-9_-]{10,128}$/.test(sessionId);
}

/**
 * Validate path format
 */
function isValidPath(path: string | undefined): boolean {
  if (!path) return false;
  // Must start with / and be reasonable length
  return path.startsWith("/") && path.length < 2048;
}

/**
 * Rate limiting check
 */
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up old rate limit entries (call periodically)
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Extract IP address from request
 */
function getClientIp(request: Request): string {
  // Check common headers (order matters)
  const headers = [
    "cf-connecting-ip", // Cloudflare
    "x-real-ip", // Nginx
    "x-forwarded-for", // Standard
    "x-client-ip",
    "x-cluster-client-ip",
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs
      return value.split(",")[0].trim();
    }
  }

  return "unknown";
}

/**
 * Sanitize string input
 */
function sanitize(input: string | undefined, maxLength = 2048): string {
  if (!input) return "";
  return input.slice(0, maxLength).trim();
}

// ============================================================================
// Main Handler
// ============================================================================

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.text();
    
    // Validate JSON
    let data: TrackingPayload;
    try {
      data = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Get client information
    const host = request.headers.get("host") || "";
    const clientIp = getClientIp(request);
    const userAgent = sanitize(data.userAgent || request.headers.get("user-agent") || "");

    // ========================================================================
    // Filter 1: Owner traffic
    // ========================================================================
    if (data.ownerKey === OWNER_SECRET) {
      return new Response(null, { status: 204 });
    }

    // ========================================================================
    // Filter 2: Development environments
    // ========================================================================
    const referrer = sanitize(data.referrer || request.headers.get("referer") || "");
    if (isDevEnvironment(host, referrer)) {
      return new Response(null, { status: 204 });
    }

    // ========================================================================
    // Filter 3: Bots and suspicious agents
    // ========================================================================
    if (isBot(userAgent) || isSuspicious(userAgent)) {
      return new Response(null, { status: 204 });
    }

    // ========================================================================
    // Filter 4: Missing or invalid user agent
    // ========================================================================
    if (!userAgent || userAgent.length < 10) {
      return new Response(null, { status: 204 });
    }

    // ========================================================================
    // Filter 5: Rate limiting
    // ========================================================================
    const rateLimitKey = `${clientIp}:${data.sessionId || "unknown"}`;
    if (!checkRateLimit(rateLimitKey)) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    // ========================================================================
    // Validation
    // ========================================================================
    if (!isValidPath(data.path)) {
      return new Response("Invalid path", { status: 400 });
    }

    if (data.sessionId && !isValidSessionId(data.sessionId)) {
      return new Response("Invalid session ID", { status: 400 });
    }

    // ========================================================================
    // Prepare event data
    // ========================================================================
    const eventData = {
      event_name: sanitize(data.event || "pageview", 100),
      path: sanitize(data.path, 2048),
      referrer: referrer || null,
      user_agent: userAgent,
      session_id: data.sessionId || null,
      client_ip: clientIp !== "unknown" ? clientIp : null,
      screen_width: data.screenWidth || null,
      screen_height: data.screenHeight || null,
      language: sanitize(data.language, 10) || null,
      timezone: sanitize(data.timezone, 50) || null,
      utm_source: sanitize(data.utmSource, 255) || null,
      utm_medium: sanitize(data.utmMedium, 255) || null,
      utm_campaign: sanitize(data.utmCampaign, 255) || null,
      created_at: new Date().toISOString(),
    };

    // ========================================================================
    // Store in database
    // ========================================================================
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error("Supabase environment variables missing");
      return new Response("Server misconfigured", { status: 500 });
    }

    const { error } = await supabase.from("analytics_events").insert(eventData);

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    // Periodic cleanup (1% chance per request)
    if (Math.random() < 0.01) {
      cleanupRateLimitStore();
    }

    // Success
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("Tracking error:", err);
    
    // Don't expose internal errors to client
    return new Response("Internal error", { status: 500 });
  }
};

// ============================================================================
// Optional: GET handler for health checks
// ============================================================================
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "analytics-tracker",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
