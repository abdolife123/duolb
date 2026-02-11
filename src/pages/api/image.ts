import type { APIRoute } from "astro";

function isAllowedSource(url: URL): boolean {
  const isSupabaseHost = url.hostname.endsWith(".supabase.co");
  const isStoragePath = url.pathname.includes("/storage/v1/");
  return isSupabaseHost && isStoragePath;
}

export const GET: APIRoute = async ({ request }) => {
  const requestUrl = new URL(request.url);
  const src = requestUrl.searchParams.get("src");

  if (!src) {
    return new Response("Missing src", { status: 400 });
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(src);
  } catch {
    return new Response("Invalid src URL", { status: 400 });
  }

  if (!isAllowedSource(upstreamUrl)) {
    return new Response("Source not allowed", { status: 403 });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return new Response("Image fetch failed", { status: upstreamResponse.status || 502 });
    }

    const headers = new Headers();
    const contentType = upstreamResponse.headers.get("content-type") || "image/jpeg";
    const etag = upstreamResponse.headers.get("etag");
    const lastModified = upstreamResponse.headers.get("last-modified");

    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Vary", "Accept");
    if (etag) headers.set("ETag", etag);
    if (lastModified) headers.set("Last-Modified", lastModified);

    return new Response(upstreamResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new Response("Image proxy error", { status: 502 });
  }
};
