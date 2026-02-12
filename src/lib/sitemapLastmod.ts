const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/;

export function formatSitemapLastmod(input: unknown, now = new Date()): string {
  const fallback = now.toISOString().slice(0, 10);
  if (typeof input !== "string") return fallback;

  const value = input.trim();
  if (!value) return fallback;
  if (DATE_ONLY_RE.test(value) || DATE_TIME_UTC_RE.test(value)) return value;

  const normalized = value
    .replace(" ", "T")
    .replace(/(\.\d+)(?=(Z|[+-]\d{2}:?\d{2})$)/, "")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2")
    .replace(/([+-]\d{2})$/, "$1:00");

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return parsed.toISOString().slice(0, 10);
}
