import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError, apiFetch, clearAuthToken, getAuthToken, setAuthToken } from "@/lib/api";

interface ApiUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_blocked?: boolean;
  user_code?: string;
}

type AuthStatus = "idle" | "checking" | "authenticated" | "guest";
type RefreshOpts = { force?: boolean };

interface AuthContextValue {
  user: ApiUser | null;
  isAdmin: boolean;
  isAccounts: boolean;
  isTeacher: boolean;
  isEditor: boolean;
  roles: string[];
  loading: boolean;
  status: AuthStatus;
  error: string | null;
  refresh: (opts?: RefreshOpts) => Promise<boolean>;
  signOut: (opts?: { redirect?: boolean }) => void;
  login: (token: string, payload?: { user?: ApiUser | null; roles?: string[] }) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_USER = "auth:user";
const STORAGE_ROLES = "auth:roles";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAccounts, setIsAccounts] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  const refreshingRef = useRef<Promise<boolean> | null>(null);
  const userRef = useRef<ApiUser | null>(null);
  const cachedRolesRef = useRef<string[] | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const cacheSession = useCallback((u: ApiUser, roles: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    localStorage.setItem(STORAGE_ROLES, JSON.stringify(roles));
    cachedRolesRef.current = roles;
  }, []);

  const clearCachedSession = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_ROLES);
    cachedRolesRef.current = null;
  }, []);

  const loadCachedSession = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const rawUser = localStorage.getItem(STORAGE_USER);
      const rawRoles = localStorage.getItem(STORAGE_ROLES);
      const u = rawUser ? (JSON.parse(rawUser) as ApiUser) : null;
      const roles = rawRoles ? (JSON.parse(rawRoles) as string[]) : [];
      cachedRolesRef.current = roles;
      return { user: u, roles };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const setGuest = useCallback(() => {
    setUser(null);
    setIsAdmin(false);
    setIsAccounts(false);
    setRoles([]);
    setStatus("guest");
    clearCachedSession();
  }, [clearCachedSession]);

  const handleSignOut = useCallback(
    (opts: { redirect?: boolean } = { redirect: true }) => {
      clearAuthToken();
      clearCachedSession();
      setGuest();
      if (opts.redirect !== false) {
        if (pathnameRef.current !== "/auth" && pathnameRef.current !== "/blocked") {
          navigate("/auth", { replace: true });
        }
      }
    },
    [navigate, setGuest, clearCachedSession]
  );

  const refresh = useCallback(
    async (opts: RefreshOpts = {}): Promise<boolean> => {
      const token = getAuthToken();
      if (!token) {
        setGuest();
        return false;
      }

      if (refreshingRef.current && !opts.force) {
        return refreshingRef.current;
      }

      setStatus("checking");
      setError(null);

      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (!settled) {
          setError("Session check timed out. Please try again.");
          if (userRef.current) {
            setStatus("authenticated");
          } else {
            setGuest();
          }
        }
      }, 10000);

      const refreshPromise = (async () => {
        try {
          const res = await apiFetch<{ user?: ApiUser; roles?: string[] }>("/auth/me", {
            timeoutMs: 6000,
          });
          const roles = Array.isArray(res?.roles) ? res.roles : [];
          const apiUser = res?.user ?? null;

          if (!apiUser) {
            throw new ApiError("Unauthorized", 401);
          }

          setUser(apiUser);
          setIsAdmin(roles.includes("admin"));
          setIsAccounts(roles.includes("accounts"));
          setIsTeacher(roles.includes("teacher"));
          setRoles(roles);
          cacheSession(apiUser, roles);
          
          if (apiUser.is_blocked) {
            handleSignOut();
            navigate("/blocked", { replace: true });
            settled = true;
            clearTimeout(fallbackTimer);
            return false;
          }

          setStatus("authenticated");
          settled = true;
          clearTimeout(fallbackTimer);
          return true;
        } catch (err: any) {
          const status = err?.status;
          const message = err?.message || "Failed to refresh session";
          setError(message);

          if (status === 401 || status === 403) {
            // Do not auto sign out on auth errors; keep session until user explicitly signs out.
            if (userRef.current) {
              setStatus("authenticated");
              settled = true;
              clearTimeout(fallbackTimer);
              return true;
            }

            const cached = loadCachedSession();
            if (cached?.user) {
              const cachedRoles = cached.roles || [];
              setUser(cached.user);
              setIsAdmin(cachedRoles.includes("admin"));
              setIsAccounts(cachedRoles.includes("accounts"));
              setIsTeacher(cachedRoles.includes("teacher"));
              setRoles(cachedRoles);
              setStatus("authenticated");
              settled = true;
              clearTimeout(fallbackTimer);
              return true;
            }

            setStatus("guest");
            settled = true;
            clearTimeout(fallbackTimer);
            return false;
          }

          // Transient errors: keep any existing user/session to avoid booting to auth
          if (userRef.current) {
            setStatus("authenticated");
            settled = true;
            clearTimeout(fallbackTimer);
            return true;
          }

          const cached = loadCachedSession();
          if (cached?.user) {
            const cachedRoles = cached.roles || [];
            setUser(cached.user);
            setIsAdmin(cachedRoles.includes("admin"));
            setIsAccounts(cachedRoles.includes("accounts"));
            setIsTeacher(cachedRoles.includes("teacher"));
            setRoles(cachedRoles);
            setStatus("authenticated");
            settled = true;
            clearTimeout(fallbackTimer);
            return true;
          }

          setGuest();
          settled = true;
          clearTimeout(fallbackTimer);
          return false;
        }
      })();

      refreshingRef.current = refreshPromise.finally(() => {
        settled = true;
        clearTimeout(fallbackTimer);
        refreshingRef.current = null;
      });

      return refreshingRef.current;
    },
    [handleSignOut, navigate, setGuest, cacheSession, loadCachedSession]
  );

  const login = useCallback(
    async (token: string, payload?: { user?: ApiUser | null; roles?: string[] }): Promise<boolean> => {
      try {
        setAuthToken(token);
        if (payload?.user) {
          setUser(payload.user);
          const roles = Array.isArray(payload.roles) ? payload.roles : [];
          setIsAdmin(roles.includes("admin"));
          setIsAccounts(roles.includes("accounts"));
          setIsTeacher(roles.includes("teacher"));
          setRoles(roles);
          setStatus("authenticated");
          setError(null);
          cacheSession(payload.user, roles);
        } else {
          setStatus("authenticated");
        }

        // Fire-and-forget refresh to validate token, but don't block login.
        refresh({ force: true }).catch(() => {
          /* non-blocking */
        });

        return true;
      } catch (error) {
        handleSignOut();
        return false;
      }
    },
    [handleSignOut, refresh, cacheSession]
  );

  useEffect(() => {
    const cached = loadCachedSession();
    const token = getAuthToken();
    if (token && cached?.user) {
      const cachedRoles = cached.roles || [];
      setUser(cached.user);
      setIsAdmin(cachedRoles.includes("admin"));
      setIsAccounts(cachedRoles.includes("accounts"));
      setIsTeacher(cachedRoles.includes("teacher"));
      setRoles(cachedRoles);
      setStatus("authenticated");
    }
    refresh();
  }, [refresh, loadCachedSession]);

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      isAccounts,
      isTeacher,
      isEditor: isAdmin || isTeacher,
      roles,
      status,
      loading: status === "checking",
      error,
      refresh,
      login,
      signOut: (opts?: { redirect?: boolean }) => handleSignOut(opts),
    }),
    [user, isAdmin, isAccounts, isTeacher, roles, status, error, refresh, login, handleSignOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
