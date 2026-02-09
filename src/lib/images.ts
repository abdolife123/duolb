export const SALON_COVER_PLACEHOLDER =
  "https://res.cloudinary.com/daxbch3om/image/upload/v1770339624/7b93947b-000b-4572-beb1-fbcd14924b7b_1_lo30fm.png";

export function resolveSalonCoverImage(value: unknown): string {
  return typeof value === "string" && value.trim()
    ? value
    : SALON_COVER_PLACEHOLDER;
}

