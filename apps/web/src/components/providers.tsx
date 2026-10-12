"use client";
import type { DemoIdentity, Locale } from "@northstar/contracts";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, request, setCsrf, STATIC_PREVIEW } from "../lib/api";
import { dictionary, type Dictionary } from "../lib/dictionaries";
import type { Me } from "../lib/types";
type Context = {
  me: Me | null;
  locale: Locale;
  t: Dictionary;
  loading: boolean;
  sessionError: boolean;
  setLocale: (l: Locale) => void;
  refresh: () => Promise<void>;
  switchRole: (role: DemoIdentity) => Promise<void>;
  start: () => Promise<void>;
  end: (reset: boolean) => Promise<void>;
  toast: (message: string, error?: boolean) => void;
};
const AppContext = createContext<Context>(null!);
const loadMe = async (create: boolean) => {
  try {
    return await request<Me>("/me");
  } catch (e) {
    if (create && e instanceof ApiError && e.status === 401) {
      await request("/demo/session", "POST");
      return request<Me>("/me");
    }
    throw e;
  }
};
let initial: Promise<Me> | undefined;
function Session({ children }: { children: ReactNode }) {
  const cache = useQueryClient(),
    [me, setMe] = useState<Me | null>(null),
    [locale, setLocaleState] = useState<Locale>("en"),
    [loading, setLoading] = useState(true),
    [sessionError, setSessionError] = useState(false),
    [notice, setNotice] = useState<{ message: string; error: boolean } | null>(
      null,
    );
  const apply = useCallback((next: Me) => {
    setCsrf(next.csrfToken);
    setMe(next);
    setLocaleState(
      (sessionStorage.getItem("northstar.locale") as Locale) ||
        next.brand.locale,
    );
    setSessionError(false);
  }, []);
  useEffect(() => {
    const savedLocale = sessionStorage.getItem("northstar.locale");
    if (savedLocale === "en" || savedLocale === "es")
      setLocaleState(savedLocale);
    let live = true;
    initial ??= loadMe(true);
    initial
      .then((m) => {
        if (live) apply(m);
      })
      .catch(() => {
        if (live) setSessionError(true);
        initial = undefined;
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [apply]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 6500);
    return () => clearTimeout(id);
  }, [notice]);
  const refresh = async () => {
    const next = await loadMe(false);
    apply(next);
  };
  const switchRole = async (identity: DemoIdentity) => {
    await cache.cancelQueries();
    await request("/demo/switch-role", "POST", { identity });
    cache.clear();
    setMe(null);
    initial = undefined;
    apply(await loadMe(false));
  };
  const start = async () => {
    setLoading(true);
    try {
      initial = undefined;
      apply(await loadMe(true));
      cache.clear();
    } catch {
      setSessionError(true);
    } finally {
      setLoading(false);
    }
  };
  const end = async (reset: boolean) => {
    await cache.cancelQueries();
    await request(reset ? "/demo/reset" : "/auth/logout", "POST");
    cache.clear();
    setCsrf("");
    setMe(null);
    initial = undefined;
  };
  const toast = useCallback(
    (message: string, error = false) => setNotice({ message, error }),
    [],
  );
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    sessionStorage.setItem("northstar.locale", l);
    document.documentElement.lang = l;
  };
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <AppContext.Provider
      value={{
        me,
        locale,
        t: dictionary[locale] as Dictionary,
        loading,
        sessionError,
        setLocale,
        refresh,
        switchRole,
        start,
        end,
        toast,
      }}
    >
      {children}
      <div
        className={`toast ${notice?.error ? "error" : ""}`}
        role={notice?.error ? "alert" : "status"}
        aria-live="polite"
      >
        {notice?.message}
      </div>
    </AppContext.Provider>
  );
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 10000, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Session>{children}</Session>
    </QueryClientProvider>
  );
}
export const useApp = () => useContext(AppContext);
export function useApi<T = any>(path: string, enabled = true) {
  const { me } = useApp();
  return useQuery<T>({
    queryKey: [me?.workspaceId, me?.userId, path],
    queryFn: ({ signal }) => request<T>(path, "GET", undefined, signal),
    enabled:
      enabled && (!!me || (STATIC_PREVIEW && path.startsWith("/public/"))),
  });
}
export function useAction() {
  const { t, toast } = useApp(),
    cache = useQueryClient(),
    [pending, setPending] = useState(false);
  const run = async <T,>(
    fn: () => Promise<T>,
    message?: string,
  ): Promise<T | undefined> => {
    setPending(true);
    try {
      const result = await fn();
      await cache.invalidateQueries();
      if (message) toast(message);
      return result;
    } catch (e) {
      let msg = t.error;
      if (e instanceof ApiError) {
        msg =
          e.code === "NETWORK"
            ? t.networkError
            : e.status === 401 || e.status === 403 || e.status === 404
              ? t.accessError
              : e.code === "CONTRAST"
                ? t.settingsContrast
                : e.status === 422
                  ? t.fieldError
                  : e.status === 429
                    ? t.limitError
                    : e.status === 409
                      ? t.acceptError
                      : t.error;
        const fields = e.fieldErrors
          ? Object.keys(e.fieldErrors).join(", ")
          : "";
        if (fields) msg += ` (${fields})`;
        if (e.requestId) msg += ` · ${e.requestId.slice(0, 8)}`;
      }
      toast(msg, true);
      return undefined;
    } finally {
      setPending(false);
    }
  };
  return { pending, run };
}
