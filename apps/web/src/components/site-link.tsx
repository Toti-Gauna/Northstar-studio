import type { AnchorHTMLAttributes } from "react";
import { siteHref } from "../lib/navigation";
export function SiteLink({
  href = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={siteHref(href)} />;
}
