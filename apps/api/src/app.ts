import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import type { AuthedRequest } from "./auth";
import { pool } from "./db";
import { AppError } from "./domain/errors";
import { env } from "./env";
import { cmsRouter, publicRouter } from "./routes/content";
import { demoRouter } from "./routes/demo";
import { filesRouter } from "./routes/files";
import { leadsRouter } from "./routes/leads";
import { projectsRouter } from "./routes/projects";
import { quotesRouter } from "./routes/quotes";
import { workspaceRouter } from "./routes/workspace";
export const app = express();
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.disable("x-powered-by");
app.use(helmet());
app.use((req: AuthedRequest, res, next) => {
  req.requestId = randomUUID();
  res.set("X-Request-Id", req.requestId);
  res.set("Cache-Control", "no-store");
  next();
});
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
    exposedHeaders: ["X-Request-Id", "X-Document-SHA256"],
  }),
);
app.use((req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("Origin") !== env.WEB_ORIGIN
  )
    return res.status(403).json({
      code: "ORIGIN",
      message: "Requests must originate from the configured web application.",
      requestId: (req as AuthedRequest).requestId,
    });
  next();
});
app.use(express.json({ limit: "100kb" }), cookieParser());
app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "northstar-api" }),
);
app.get("/ready", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ database: "ready" });
  } catch {
    res.status(503).json({ database: "unavailable" });
  }
});
app.use(demoRouter);
app.use("/public", publicRouter);
app.use("/operator", cmsRouter);
app.use(
  leadsRouter,
  quotesRouter,
  filesRouter,
  projectsRouter,
  workspaceRouter,
);
app.use((req, res) =>
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Endpoint not found.",
    requestId: (req as AuthedRequest).requestId,
  }),
);
app.use(
  (
    err: unknown,
    req: AuthedRequest,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    let status = 500,
      code = "INTERNAL",
      message =
        "The operation could not be completed. Retry or contact the studio.",
      fieldErrors: Record<string, string[]> | undefined;
    if (err instanceof ZodError) {
      status = 422;
      code = "VALIDATION";
      message = "Check the highlighted fields.";
      fieldErrors = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".") || "form";
        (fieldErrors[key] ??= []).push(issue.message);
      }
    } else if (err instanceof AppError) {
      ({ status, code, message, fieldErrors } = err);
    } else if (err && typeof err === "object") {
      const e = err as { code?: string; status?: number; message?: string };
      if (e.code === "LIMIT_FILE_SIZE") {
        status = 413;
        code = e.code;
        message = "Maximum attachment size is 2 MB.";
      } else if (e.code?.startsWith("LIMIT_")) {
        status = 422;
        code = e.code;
        message = "Upload one file using the file field.";
      } else if (e.status && e.status >= 400 && e.status < 500) {
        status = e.status;
        code = e.code || "BAD_REQUEST";
        message =
          status === 400
            ? "The request body is invalid."
            : e.message || message;
      }
    }
    if (status === 500)
      console.error(
        JSON.stringify({
          requestId: req.requestId,
          code: "INTERNAL",
          errorType: err instanceof Error ? err.name : "Unknown",
        }),
      );
    res
      .status(status)
      .json({ code, message, fieldErrors, requestId: req.requestId });
  },
);
