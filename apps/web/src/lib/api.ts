import { siteHref } from "./navigation";
export const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
let csrfToken = "";
export const setCsrf = (token: string) => {
  csrfToken = token;
};
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[]>,
    public requestId?: string,
  ) {
    super(message);
  }
}
export async function request<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  if (STATIC_PREVIEW) {
    if (method !== "GET" || !path.startsWith("/public/"))
      throw new ApiError(
        "API_NOT_CONFIGURED",
        "The interactive demo requires a connected API.",
        503,
      );
    const response = await fetch(siteHref("/published-catalog.json"), {
      signal,
    });
    if (!response.ok)
      throw new ApiError(
        "NETWORK",
        "Public catalog unavailable.",
        response.status,
      );
    const catalog = await response.json();
    const [kind, id] = path.slice("/public/".length).split("/");
    const data = id
      ? catalog[kind]?.items.find((item: { id: string }) => item.id === id)
      : catalog[kind];
    if (!data)
      throw new ApiError("NOT_FOUND", "Published content not found.", 404);
    return data;
  }
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      credentials: "include",
      signal,
      headers: {
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        "X-CSRF-Token": csrfToken,
        "X-Northstar-Demo": "1",
        ...(path === "/leads" &&
        body &&
        typeof body === "object" &&
        "__key" in body
          ? { "Idempotency-Key": String((body as any).__key) }
          : {}),
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(
                body && typeof body === "object" && "__key" in body
                  ? Object.fromEntries(
                      Object.entries(body).filter(([k]) => k !== "__key"),
                    )
                  : body,
              ),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("NETWORK", "Connection interrupted.", 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      data.code || "INTERNAL",
      data.message || "Operation failed.",
      response.status,
      data.fieldErrors,
      data.requestId,
    );
  return data;
}
export async function download(path: string, filename: string) {
  const res = await fetch(`${API}${path}`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json();
    throw new ApiError(data.code, data.message, res.status);
  }
  const blob = await res.blob(),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
