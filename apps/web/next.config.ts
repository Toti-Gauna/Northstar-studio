import type { NextConfig } from "next";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env", quiet: true });
const apiUrl = new URL(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
);
if (
  !["http:", "https:"].includes(apiUrl.protocol) ||
  apiUrl.username ||
  apiUrl.password
)
  throw new Error(
    "NEXT_PUBLIC_API_URL must be a public HTTP(S) API URL without credentials",
  );
const config: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@northstar/contracts"],
};
export default config;
