import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
dotenv.config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});
export const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const boolean = z.enum(["true", "false"]).transform((x) => x === "true");
export const env = z
  .object({
    DATABASE_URL: z.url(),
    PORT: z.coerce.number().int().default(4000),
    WEB_ORIGIN: z.url(),
    COOKIE_SECURE: boolean.default(false),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    DEMO_TTL_HOURS: z.coerce.number().min(0.01).max(720).default(24),
    DEMO_MAX_LEADS: z.coerce.number().int().min(12).max(1000).default(100),
    DEMO_MAX_FILES: z.coerce.number().int().min(1).max(100).default(40),
    DEMO_STORAGE_BYTES: z.coerce
      .number()
      .int()
      .min(1000000)
      .max(100000000)
      .default(20000000),
    STORAGE_DIR: z.string().default("./storage"),
    STORAGE_DURABLE: boolean.default(false),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
    WORKER_INTERVAL_MS: z.coerce.number().int().min(1000).default(60000),
  })
  .parse(process.env);
if (env.COOKIE_SAME_SITE === "none" && !env.COOKIE_SECURE)
  throw new Error("SameSite=None requires secure cookies");
if (
  process.env.NODE_ENV === "production" &&
  (!env.COOKIE_SECURE || !env.STORAGE_DURABLE)
)
  throw new Error(
    "Production requires secure cookies and explicitly durable storage",
  );
