import { supabase } from "../supabase";
import { calculateDistanceKm } from "./calculateDistance";

export type NearbySalon = {
  id: number;
  salon_name: string | null;
  slug: string;
  description: string | null;
  cover_image: string | null;
  full_address: string | null;
  city_slug: string | null;
  category_slug: string | null;
  latitude: number | null;
  longitude: number | null;
  rating_value: number | null;
  rating_count: number | null;
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  distance_km: number;
};

type UserCoords = { latitude: number; longitude: number };

type FetchNearbyParams = {
  categorySlug: string;
  userCoords?: UserCoords | null;
  radiusKm?: number;
  limit?: number;
  maxFetch?: number;
  fallbackCitySlug?: string;
};

type SalonRow = Omit<NearbySalon, "distance_km">;

export async function fetchNearbySalons({
  categorySlug,
  userCoords,
  radiusKm = 15,
  limit = 24,
  maxFetch = 500,
  fallbackCitySlug,
}: FetchNearbyParams): Promise<NearbySalon[]> {
  const normalizedCategorySlug = (categorySlug || "").trim().toLowerCase();
  if (!normalizedCategorySlug) return [];

  const hasValidUserCoords =
    typeof userCoords?.latitude === "number" &&
    Number.isFinite(userCoords.latitude) &&
    typeof userCoords?.longitude === "number" &&
    Number.isFinite(userCoords.longitude);

  const safeRadiusKm =
    typeof radiusKm === "number" && Number.isFinite(radiusKm) && radiusKm > 0
      ? radiusKm
      : 15;

  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : 24;

  const safeMaxFetch =
    typeof maxFetch === "number" && Number.isFinite(maxFetch) && maxFetch > 0
      ? Math.floor(maxFetch)
      : 500;

  const normalizedFallbackCitySlug =
    typeof fallbackCitySlug === "string"
      ? fallbackCitySlug.trim().toLowerCase()
      : "";

  if (!hasValidUserCoords && normalizedFallbackCitySlug) {
    const { data, error } = await supabase
      .from("salons")
      .select(
        `
        id,
        salon_name,
        slug,
        description,
        cover_image,
        full_address,
        city_slug,
        category_slug,
        latitude,
        longitude,
        rating_value,
        rating_count,
        phone,
        website,
        booking_url
      `
      )
      .eq("category_slug", normalizedCategorySlug)
      .eq("city_slug", normalizedFallbackCitySlug)
      .order("rating_value", { ascending: false })
      .limit(safeLimit);

    if (error || !data) return [];

    return (data as unknown as SalonRow[]).map((s) => ({
      ...s,
      distance_km: 0,
    }));
  }

  if (!hasValidUserCoords) return [];
  const coords = userCoords as UserCoords;

  const { data, error } = await supabase
    .from("salons")
    .select(
      `
      id,
      salon_name,
      slug,
      description,
      cover_image,
      full_address,
      city_slug,
      category_slug,
      latitude,
      longitude,
      rating_value,
      rating_count,
      phone,
      website,
      booking_url
    `
    )
    .eq("category_slug", normalizedCategorySlug)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(safeMaxFetch);

  if (error || !data) return [];

  const withDistance: NearbySalon[] = (data as unknown as SalonRow[])
    .map((s) => {
      const distance_km = calculateDistanceKm(
        { latitude: coords.latitude, longitude: coords.longitude },
        { latitude: s.latitude, longitude: s.longitude }
      );

      if (distance_km == null) return null;

      return {
        ...s,
        distance_km,
      } as NearbySalon;
    })
    .filter((x): x is NearbySalon => x !== null)
    .filter((s) => s.distance_km <= safeRadiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, safeLimit);

  return withDistance;
}
