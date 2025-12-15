import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { EditModeProvider } from "./contexts/EditModeContext";
import { Suspense, lazy } from "react";
import { toast } from "sonner";
import { Button } from "./components/ui/button";

// Lazy load components for better performance
const Auth = lazy(() => import("./pages/Auth"));
const Blocked = lazy(() => import("./pages/Blocked"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Assignments = lazy(() => import("./pages/Assignments"));
const Timetable = lazy(() => import("./pages/Timetable"));
const Profile = lazy(() => import("./pages/Profile"));
const Users = lazy(() => import("./pages/Users"));
const Progress = lazy(() => import("./pages/Progress"));
const Library = lazy(() => import("./pages/Library"));
const BookDetail = lazy(() => import("./pages/BookDetail"));
const Submissions = lazy(() => import("./pages/Submissions"));
const Guides = lazy(() => import("./pages/Guides"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Softwares = lazy(() => import("./pages/Softwares"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rawBase =
  (import.meta.env.VITE_BASENAME as string | undefined) ||
  (import.meta.env.BASE_URL as string | undefined) ||
  "/";
const BASENAME = rawBase === "/"
  ? ""
  : `/${rawBase.replace(/^\/+|\/+$/g, "")}`;
const AUTH_PATH = BASENAME ? `${BASENAME}/auth` : "/auth";

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const SessionErrorNotice = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="max-w-lg w-full bg-card border border-border/50 rounded-xl shadow-lg p-6 flex flex-col gap-4 text-center">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">We couldn&apos;t verify your session</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button onClick={onRetry}>Retry</Button>
        <Button variant="outline" onClick={() => (window.location.href = AUTH_PATH)}>
          Go to login
        </Button>
      </div>
    </div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({
  children,
  allowAccounts = false,
}: {
  children: React.ReactNode;
  allowAccounts?: boolean;
}) => {
  const { user, loading, error, refresh, isAccounts } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    if (error) {
      return <SessionErrorNotice message={error} onRetry={() => refresh({ force: true })} />;
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Immediately route blocked users to the blocked page
  if (user.is_blocked) {
    return <Navigate to="/blocked" replace />;
  }

  if (isAccounts && !allowAccounts) {
    toast.error("Accounts role can only access Users.");
    return <Navigate to="/users" replace />;
  }

  return <>{children}</>;
};

// Admin-only route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading, error, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    if (error) {
      return <SessionErrorNotice message={error} onRetry={() => refresh({ force: true })} />;
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check isAdmin from useAuth hook
  if (!isAdmin) {
    toast.error("Access denied. Admin privileges required.");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Users page route: allow admin or accounts role
const UsersRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isAccounts, loading, error, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    if (error) {
      return <SessionErrorNotice message={error} onRetry={() => refresh({ force: true })} />;
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!(isAdmin || isAccounts)) {
    toast.error("Access denied. Admin or accounts role required.");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Admin or Teacher route (for grading/submissions)
const TeacherOrAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isTeacher, loading, error, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    if (error) {
      return <SessionErrorNotice message={error} onRetry={() => refresh({ force: true })} />;
    }
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!(isAdmin || isTeacher)) {
    toast.error("Access denied. Teacher or admin required.");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public-only route (redirects if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main App component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter
          basename={BASENAME || undefined}
          future={{ 
            v7_startTransition: true, 
            v7_relativeSplatPath: true 
          }}
        >
          <AuthProvider>
            <EditModeProvider>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={
                    <PublicRoute>
                      <Navigate to="/auth" replace />
                    </PublicRoute>
                  } />
                  
                  <Route path="/auth" element={
                    <PublicRoute>
                      <Auth />
                    </PublicRoute>
                  } />
                  
                  <Route path="/blocked" element={<Blocked />} />
                  
                  {/* Protected dashboard routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/courses" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Courses />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/courses/:courseId" element={
                    <ProtectedRoute>
                      <CourseDetail />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/assignments" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Assignments />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/timetable" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Timetable />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/library" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Library />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/library/:bookId" element={
                    <ProtectedRoute>
                      <BookDetail />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/guides" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Guides />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/guides/video/:id" element={
                    <ProtectedRoute>
                      <GuideDetail />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/guides/article/:id" element={
                    <ProtectedRoute>
                      <GuideDetail />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/softwares" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Softwares />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/certificates" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Certificates />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/progress" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Progress />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Profile />
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin-only routes */}
                  <Route path="/users" element={
                    <UsersRoute>
                      <DashboardLayout>
                        <Users />
                      </DashboardLayout>
                    </UsersRoute>
                  } />
                  
                  <Route path="/submissions" element={
                    <TeacherOrAdminRoute>
                      <DashboardLayout>
                        <Submissions />
                      </DashboardLayout>
                    </TeacherOrAdminRoute>
                  } />
                  
                  {/* Fallback routes */}
                  <Route path="/login" element={<Navigate to="/auth" replace />} />
                  <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* 404 - Must be last */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </EditModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
