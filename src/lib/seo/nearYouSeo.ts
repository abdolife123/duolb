type NearYouSeoInput = {
  categoryName: string; // e.g. "Friseure"
  radiusKm?: number; // e.g. 25 (default UI radius)
};

export function buildNearYouSeo({
  categoryName,
  radiusKm = 25,
}: NearYouSeoInput) {
  const safeRadiusKm =
    typeof radiusKm === "number" && Number.isFinite(radiusKm) && radiusKm > 0
      ? radiusKm
      : 25;

  const name = (categoryName || "").trim() || "Salons";
  const title = `${name} in deiner Nähe - Top Anbieter im Umkreis von ${safeRadiusKm} km in Deutschland`;

  const description = `Finde die besten ${name.toLowerCase()} in deiner Nähe. Vergleiche Bewertungen, Leistungen und Standorte von geprüften Anbietern in Deutschland im Umkreis von ${safeRadiusKm} km.`;

  const h1 = `${name} in deiner Nähe`;

  return {
    title,
    description,
    h1,
  };
}
