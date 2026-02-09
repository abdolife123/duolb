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

export type UserCoordinates = {
  latitude: number;
  longitude: number;
};
