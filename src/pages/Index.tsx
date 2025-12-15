import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const rawBase =
  (import.meta.env.VITE_BASENAME as string | undefined) ||
  (import.meta.env.BASE_URL as string | undefined) ||
  "/";
const BASENAME =
  rawBase === "/"
    ? ""
    : `/${rawBase.replace(/^\/+|\/+$/g, "")}`;

const Index = () => {
  const { user, loading, refresh } = useAuth();
  const dashboardPath = BASENAME ? `${BASENAME}/dashboard` : "/dashboard";
  const authPath = BASENAME ? `${BASENAME}/auth` : "/auth";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={dashboardPath} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-lg font-semibold">You are not logged in.</p>
      <div className="flex gap-3">
        <Button onClick={() => refresh()}>Retry session</Button>
        <Button variant="outline" onClick={() => (window.location.href = authPath)}>
          Go to login
        </Button>
      </div>
    </div>
  );
};

export default Index;
