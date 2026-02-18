type MetaDescriptionInput = {
  description?: string | null;
  title?: string | null;
  pathname?: string | null;
  robots?: string | null;
};

const MAX_DESCRIPTION_LENGTH = 155;

const normalizeWhitespace = (value: string) =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const isNoindex = (robots?: string | null) =>
  typeof robots === "string" && /\bnoindex\b/i.test(robots);

const slugToLabel = (slug: string) =>
  decodeURIComponent(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const selectVariant = (variants: string[]) =>
  variants.find((v) => v.length <= MAX_DESCRIPTION_LENGTH) ||
  variants[variants.length - 1];

const fallbackFromTitle = (title?: string | null) => {
  const base = normalizeWhitespace(title || "")
    .replace(/\s*\|\s*duolb.*$/i, "")
    .replace(/\s*[-|]\s*duolb.*$/i, "")
    .trim();

  const topic = base || "Beauty und Wellness in Deutschland";
  return selectVariant([
    `${topic}. Bewertungen, Fotos und Kontaktdaten auf duolb.com.`,
    `${topic} auf duolb.com.`,
  ]);
};

const fromRouteTemplate = (pathname: string, title?: string | null) => {
  const cityCategoryMatch = pathname.match(/^\/directory\/city\/([^/]+)\/([^/]+)\/?$/);
  if (cityCategoryMatch) {
    const city = slugToLabel(cityCategoryMatch[1]);
    const category = slugToLabel(cityCategoryMatch[2]);
    return selectVariant([
      `Finde ${category} Studios in ${city}. Vergleiche Bewertungen, Fotos und Kontaktdaten auf duolb.com.`,
      `${category} Studios in ${city} mit Bewertungen und Kontaktdaten auf duolb.com.`,
      `${category} Studios in ${city} auf duolb.com.`,
    ]);
  }

  const categoryMatch = pathname.match(/^\/directory\/category\/([^/]+)\/?$/);
  if (categoryMatch) {
    const category = slugToLabel(categoryMatch[1]);
    return selectVariant([
      `Entdecke gepruefte ${category} Studios. Bewertungen, Fotos und direkte Kontaktdaten auf duolb.com.`,
      `Entdecke ${category} Studios mit Bewertungen, Fotos und Kontaktdaten auf duolb.com.`,
      `${category} Studios mit Bewertungen und Kontaktdaten auf duolb.com.`,
    ]);
  }

  const salonMatch = pathname.match(/^\/salon\/([^/]+)\/?$/);
  if (salonMatch) {
    const fromTitle = normalizeWhitespace(title || "").split("–")[0].trim();
    const titleMatch = fromTitle.match(/^(.*)\sin\s(.+)$/i);
    const salonName = titleMatch?.[1]?.trim() || slugToLabel(salonMatch[1]);
    const city = titleMatch?.[2]?.trim() || "Deutschland";

    return selectVariant([
      `${salonName} in ${city}. Infos, Bewertungen, Fotos und Kontakt auf duolb.com.`,
      `${salonName} in ${city}. Infos und Kontakt auf duolb.com.`,
      `${salonName} auf duolb.com.`,
    ]);
  }

  return null;
};

export const resolveMetaDescription = ({
  description,
  title,
  pathname,
  robots,
}: MetaDescriptionInput) => {
  const raw = normalizeWhitespace(description || "");

  if (isNoindex(robots)) {
    return raw || "";
  }

  if (raw && raw.length <= MAX_DESCRIPTION_LENGTH) {
    return raw;
  }

  const routeTemplate = pathname ? fromRouteTemplate(pathname, title) : null;
  if (routeTemplate) return routeTemplate;

  if (!raw) {
    return fallbackFromTitle(title);
  }

  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const firstSentence = sentences.find((s) => s.length <= MAX_DESCRIPTION_LENGTH);
  if (firstSentence) return firstSentence;

  return fallbackFromTitle(title);
};
