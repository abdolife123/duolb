type TitleTemplateInput = {
  title?: string | null;
  pathname?: string | null;
  robots?: string | null;
};

const MAX_TITLE_LENGTH = 60;

const isNoindex = (robots?: string | null) =>
  typeof robots === "string" && /\bnoindex\b/i.test(robots);

const slugToLabel = (slug: string) =>
  decodeURIComponent(slug || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());

const shortenByWords = (value: string, maxLen: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && words.join(" ").length > maxLen) {
    words.pop();
  }
  return words.join(" ");
};

const fitWithFallback = (base: string, suffix: string) => {
  const full = `${base}${suffix}`;
  if (full.length <= MAX_TITLE_LENGTH) return full;
  if (base.length <= MAX_TITLE_LENGTH) return base;
  return shortenByWords(base, MAX_TITLE_LENGTH);
};

const fromCategoryPath = (pathname: string) => {
  const match = pathname.match(/^\/directory\/category\/([^/]+)\/?$/);
  if (!match) return null;
  const category = slugToLabel(match[1]);
  return fitWithFallback(`${category} Studios`, " | Bewertungen & Infos");
};

const fromCityCategoryPath = (pathname: string) => {
  const match = pathname.match(/^\/directory\/city\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  const city = slugToLabel(match[1]);
  const category = slugToLabel(match[2]);
  return fitWithFallback(`${category} in ${city}`, " | Studios & Bewertungen");
};

const fromSalonPath = (pathname: string, title?: string | null) => {
  const match = pathname.match(/^\/salon\/([^/]+)\/?$/);
  if (!match) return null;

  const cleaned = (title || "").replace(/\s+/g, " ").trim();
  const left = cleaned.split("|")[0].split("–")[0].trim();
  const titleMatch = left.match(/^(.*)\sin\s(.+)$/i);

  const salonName = titleMatch?.[1]?.trim() || slugToLabel(match[1]);
  const city = titleMatch?.[2]?.trim() || "Deutschland";

  return fitWithFallback(`${salonName} in ${city}`, " | Salon Infos");
};

export const resolveTemplateTitle = ({ title, pathname, robots }: TitleTemplateInput) => {
  if (!pathname || isNoindex(robots)) {
    return title || "";
  }

  return (
    fromCityCategoryPath(pathname) ||
    fromCategoryPath(pathname) ||
    fromSalonPath(pathname, title) ||
    (title || "")
  );
};
