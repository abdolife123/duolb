import type { MiddlewareHandler } from "astro";

function withUtf8Charset(contentType: string): string {
  if (/;\s*charset=/i.test(contentType)) return contentType;
  const mime = contentType.split(";")[0]?.trim();
  if (!mime) return contentType;
  return `${mime}; charset=utf-8`;
}

export const onRequest: MiddlewareHandler = async (_ctx, next) => {
  const response = await next();

  const contentType = response.headers.get("Content-Type");
  if (!contentType) return response;

  // Some deployments default `text/html` to Windows-1252 if charset is missing,
  // which turns UTF-8 characters like "⭐" into "â­". Force UTF-8.
  if (/^text\/html\b/i.test(contentType)) {
    response.headers.set("Content-Type", withUtf8Charset(contentType));
  }

  if (/^(application|text)\/xml\b/i.test(contentType)) {
    response.headers.set("Content-Type", withUtf8Charset(contentType));
  }

  return response;
};

