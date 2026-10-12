import rateLimit from "express-rate-limit";
import type { AuthedRequest } from "./auth";
export function requestLimit(limit: number) {
  return rateLimit({
    windowMs: 60000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        code: "RATE_LIMIT",
        message: "Too many attempts. Please retry in a minute.",
        requestId: (req as AuthedRequest).requestId,
      }),
  });
}
