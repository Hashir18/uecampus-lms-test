const defaultLocalBase = (() => {
  if (typeof window === "undefined") return "/api";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "https://backend/public/api";
  }
  return "/api";
})();

const rawBase = (import.meta.env.VITE_API_URL as string | undefined) || defaultLocalBase;
const API_BASE = rawBase.replace(/\/$/, "");

// Allow a broader set of fallback bases in dev to handle host/port/path mismatches
function candidateBases() {
  const bases: string[] = [];
  const add = (b?: string) => {
    if (!b) return;
    const base = b.replace(/\/$/, "");
    if (!bases.includes(base)) {
      bases.push(base);
    }
  };

  add(API_BASE);
  add(defaultLocalBase);
  add("https://backend/public/api");
  add("https://backend/public/api");
  add("/api");

  // Common dev ports
  [8080, 8086].forEach((port) => {
    add(`https://localhost:${port}`);
    add(`https://localhost:${port}/api`);
  });

  return bases;
}

const DEFAULT_TIMEOUT_MS = 12000;

type ApiInit = RequestInit & {
  timeoutMs?: number;
  /**
   * Skip attaching Authorization header (still allows token query fallback).
   */
  skipAuthHeader?: boolean;
  /**
   * Override token instead of reading from storage.
   */
  token?: string | null;
};

export class ApiError extends Error {
  status?: number;
  data?: any;
  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Get authentication token from storage
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Set auth token
export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

// Clear auth token
export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

function buildUrl(base: string, path: string, token: string | null) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const urlObj = new URL(`${base}${normalizedPath}`, window.location.origin);
  if (token && !urlObj.searchParams.has("token")) {
    urlObj.searchParams.set("token", token);
  }
  return urlObj.toString();
}

// Main API fetch function with timeout + consistent error surface and base fallbacks
export async function apiFetch<T = any>(path: string, options: ApiInit = {}): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    skipAuthHeader = false,
    token: overrideToken,
    ...rest
  } = options;

  const isFormData = rest.body instanceof FormData;
  const token = overrideToken ?? getAuthToken();
  const bases = candidateBases();
  let lastError: any = null;
  const allow404Fallback = path.startsWith("/auth/");

  for (const base of bases) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = buildUrl(base, path, token);

    try {
      const res = await fetch(url, {
        ...rest,
        headers: {
          Accept: "application/json",
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(!skipAuthHeader && token ? { Authorization: `Bearer ${token}` } : {}),
          ...(rest.headers || {}),
        },
        body: isFormData
          ? rest.body
          : rest.body && typeof rest.body !== "string"
            ? JSON.stringify(rest.body)
            : rest.body,
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await res.json().catch(() => ({})) : await res.text();

      if (!res.ok) {
        const message =
          (isJson && typeof data === "object" && (data as any)?.error) ||
          (isJson && typeof data === "object" && (data as any)?.message) ||
          (typeof data === "string" ? data : `Request failed (${res.status})`);
        throw new ApiError(message || "Request failed", res.status, data);
      }

      clearTimeout(timer);
      return data as T;
    } catch (error: any) {
      clearTimeout(timer);
      lastError = error;

      const isNetwork =
        error?.name === "AbortError" ||
        error?.name === "TypeError" ||
        (error?.message || "").toLowerCase().includes("network");

      // Only try the next base on network/connection issues
      if (isNetwork) {
        continue;
      }
      if (allow404Fallback && error instanceof ApiError && error.status === 404) {
        continue;
      }
      if (!(error instanceof ApiError && error.status === undefined)) {
        break;
      }
    }
  }

  if (lastError?.name === "AbortError") {
    throw new ApiError("Request timed out. Please retry.", 408);
  }
  if (lastError?.name === "TypeError") {
    throw new ApiError("Network error - Please check your connection.");
  }
  if (lastError instanceof ApiError) {
    throw lastError;
  }
  throw new ApiError(lastError?.message || "Network error - Please check your connection.");
}
