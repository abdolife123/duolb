export const SALON_COVER_PLACEHOLDER =
  "https://res.cloudinary.com/daxbch3om/image/upload/v1770339624/7b93947b-000b-4572-beb1-fbcd14924b7b_1_lo30fm.png";

function proxySupabaseImageUrl(src: string): string {
  if (!src.includes("supabase.co/storage/v1/")) return src;
  return `/api/image?src=${encodeURIComponent(src)}`;
}

export function resolveSalonCoverImage(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return SALON_COVER_PLACEHOLDER;
  return proxySupabaseImageUrl(value.trim());
}

type SupabaseImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif" | "origin";
  resize?: "cover" | "contain" | "fill";
};

export function optimizeSupabaseImageUrl(
  value: unknown,
  options: SupabaseImageOptions = {}
): string {
  if (typeof value !== "string" || !value.trim()) return SALON_COVER_PLACEHOLDER;

  const src = value.trim();
  if (!src.includes("supabase.co/storage/v1/")) return src;

  try {
    const url = new URL(src);

    // Ensure we use Supabase's image transformation endpoint.
    url.pathname = url.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );

    const { width, height, quality = 72, format = "webp", resize = "cover" } = options;

    if (width && Number.isFinite(width)) url.searchParams.set("width", String(Math.round(width)));
    if (height && Number.isFinite(height)) url.searchParams.set("height", String(Math.round(height)));
    url.searchParams.set("quality", String(Math.max(30, Math.min(90, quality))));
    url.searchParams.set("resize", resize);
    if (format !== "origin") url.searchParams.set("format", format);

    return proxySupabaseImageUrl(url.toString());
  } catch {
    return proxySupabaseImageUrl(src);
  }
}
