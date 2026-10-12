export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export function siteHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//")
    ? `${BASE_PATH}${href}`
    : href;
}
