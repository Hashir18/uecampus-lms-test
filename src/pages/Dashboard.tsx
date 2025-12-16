import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Clock, PlayCircle, CheckCircle2, AlertCircle, Trash2, Copy, Edit2 } from "lucide-react";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import LMSGuides from "@/components/LMSGuides";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  code: string;
  progress: number;
  instructor: string | null;
  next_class: string | null;
  grade: string | null;
}

export default function Dashboard() {
  const { isEditMode, isAdmin, isEditor } = useEditMode();
  const isPrivileged = isAdmin || isEditor;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({
    totalActivity: 0,
    inProgress: 0,
    completed: 0,
    totalCourses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, isPrivileged]);

  const fetchDashboardData = async () => {
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [courseListRes, enrollmentsRes, statsRes] = await Promise.allSettled([
        apiFetch<any[]>(isPrivileged ? "/courses" : "/courses?enrolledOnly=true"),
        apiFetch<any[]>("/enrollments"),
        apiFetch<{
          total_activity: number;
          in_progress: number;
          completed: number;
          total_courses: number;
        }>(`/dashboard/stats?scope=${isPrivileged ? "all" : "personal"}${user?.id ? `&user_id=${user.id}` : ""}`),
      ]);

      const courseList = courseListRes.status === "fulfilled" ? courseListRes.value : [];
      const enrollments = enrollmentsRes.status === "fulfilled" ? enrollmentsRes.value : [];
      const liveStats = statsRes.status === "fulfilled" ? statsRes.value : null;

      const enrollMap: Record<string, any> = {};
      enrollments.forEach((e) => { enrollMap[e.course_id] = e; });
      const enrolledIds = Array.from(new Set(enrollments.map((e) => e.course_id))).filter(Boolean);

      // Hydrate courses from enrollments first, backfill with course list, then fetch missing ids
      const courseMap: Record<string, any> = {};
      (courseList || []).forEach((c: any) => { courseMap[c.id] = c; });
      let hydratedCourses: any[] = [];

      if (enrolledIds.length) {
        const missingIds = enrolledIds.filter((id) => !courseMap[id]);
        if (missingIds.length) {
          const fetched = await Promise.all(
            missingIds.map((id) => apiFetch<any>(`/courses/${id}`).catch(() => null))
          );
          fetched.filter(Boolean).forEach((c: any) => { courseMap[c.id] = c; });
        }
        hydratedCourses = enrolledIds.map((id) => courseMap[id]).filter(Boolean);
      }

      if (!hydratedCourses.length && courseList?.length) {
        hydratedCourses = courseList;
      }

      const coursesWithProgress = (hydratedCourses || []).slice(0, 6).map((c: any) => ({
        ...c,
        progress: enrollMap[c.id]?.progress || c.progress || 0,
      }));
      setCourses((prev) => (coursesWithProgress.length ? (coursesWithProgress as Course[]) : prev));

      if (liveStats) {
        setStats({
          totalActivity: liveStats.total_activity ?? 0,
          inProgress: liveStats.in_progress ?? 0,
          completed: liveStats.completed ?? 0,
          totalCourses: liveStats.total_courses ?? (coursesWithProgress.length || courseList?.length || 0)
        });
      } else {
        const fallbackTotalCourses = coursesWithProgress.length || courseList?.length || 0;
        const activeEnrollments = enrollments.filter(e => e.status === "active" || !e.status);
        const completedEnrollments = activeEnrollments.filter(e => (e.progress || 0) >= 100).length;
        const inProgressEnrollments = Math.max(activeEnrollments.length - completedEnrollments, 0);
        const avgProgress = activeEnrollments.length
          ? Math.round(activeEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / activeEnrollments.length)
          : 0;

        setStats({
          totalActivity: avgProgress,
          inProgress: inProgressEnrollments,
          completed: completedEnrollments,
          totalCourses: fallbackTotalCourses
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Keep previous stats/courses on error; do not blank the UI
    } finally {
      setLoading(false);
    }
  };

  const updateCourse = async (id: string, field: string, value: any) => {
    try {
      await apiFetch(`/courses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value })
      });

      setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
    } catch (error: any) {
      toast.error("Failed to update course");
      console.error(error);
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await apiFetch(`/courses/${id}`, { method: "DELETE" });

      setCourses(courses.filter(c => c.id !== id));
      toast.success("Course deleted");
      await fetchDashboardData();
    } catch (error: any) {
      toast.error("Failed to delete course");
    }
  };

  const duplicateCourse = async (course: Course) => {
    try {
      await apiFetch("/courses", {
        method: "POST",
        body: JSON.stringify({
          title: `${course.title} (Copy)`,
          code: `${course.code}-COPY-${Date.now()}`,
          progress: course.progress,
          instructor: course.instructor,
          next_class: course.next_class,
          grade: course.grade,
          category: "Bachelor's Programs",
          status: "active"
        })
      });
      fetchDashboardData();
      toast.success("Course duplicated");
    } catch (error: any) {
      toast.error("Failed to duplicate course");
    }
  };

  if (loading) {
    return <div className="animate-fade-in">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <WelcomeDialog />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {isEditMode && (
          <Badge variant="outline" className="animate-pulse">
            <Edit2 className="h-3 w-3 mr-1" />
            Edit Mode Active
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-muted-foreground">Total Activity</h3>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-4xl font-bold">{stats.totalActivity}%</div>
        </Card>

        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-muted-foreground">In Progress</h3>
            <AlertCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="text-4xl font-bold">{stats.inProgress}</div>
        </Card>

        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-muted-foreground">Completed</h3>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <div className="text-4xl font-bold">{stats.completed}</div>
        </Card>

        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-muted-foreground">Total Courses</h3>
            <BookOpen className="h-4 w-4 text-accent" />
          </div>
          <div className="text-4xl font-bold">{stats.totalCourses}</div>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Enrolled Courses</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="p-6 hover:shadow-glow transition-all bg-gradient-card group relative">
              {isEditMode && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    onClick={() => duplicateCourse(course)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => deleteCourse(course.id)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-4">
                {isEditMode ? (
                  <>
                    <Input
                      value={course.code}
                      onChange={(e) => updateCourse(course.id, "code", e.target.value)}
                      placeholder="Course Code"
                    />
                    <Input
                      value={course.title}
                      onChange={(e) => updateCourse(course.id, "title", e.target.value)}
                      placeholder="Course Title"
                    />
                    <Input
                      type="number"
                      value={course.progress}
                      onChange={(e) => updateCourse(course.id, "progress", parseInt(e.target.value))}
                      placeholder="Progress %"
                    />
                  </>
                ) : (
                  <>
                    <Badge variant="secondary">{course.code}</Badge>
                    <h3 className="text-lg font-semibold">{course.title}</h3>
                    <Progress value={course.progress} className="h-2" />
                    <Button
                      className="w-full bg-gradient-primary"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Continue Learning
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* LMS Guides Section */}
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">LMS Learning Guides</h2>
          <Button variant="outline" onClick={() => window.location.href = '/guides'}>
            View All
          </Button>
        </div>
        <LMSGuides isAdmin={isAdmin} maxDisplay={3} showUploadButton={false} />
      </div>
    </div>
  );
}
