import type { Locale } from "@northstar/contracts";
export function dateTime(value: string, locale: Locale, timezone: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}
