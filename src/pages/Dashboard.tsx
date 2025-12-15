import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Clock, Video, PlayCircle, CheckCircle2, AlertCircle, Plus, Trash2, Copy, Edit2, Calendar } from "lucide-react";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import LMSGuides from "@/components/LMSGuides";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

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
  const { isEditMode, isAdmin } = useEditMode();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({
    totalActivity: 64,
    inProgress: 8,
    completed: 12,
    upcoming: 14
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!user) return;

      const enrollments = await apiFetch<any[]>("/enrollments");
      const courseList = await apiFetch<any[]>("/courses?enrolledOnly=true");
      const assignments = await apiFetch<any[]>("/assignments");
      const progress = await apiFetch<any[]>("/progress");

      const enrollMap: Record<string, any> = {};
      enrollments.forEach((e) => { enrollMap[e.course_id] = e; });
      const coursesWithProgress = courseList.slice(0, 6).map((c: any) => ({
        ...c,
        progress: enrollMap[c.id]?.progress || c.progress || 0,
      }));
      setCourses(coursesWithProgress as Course[]);

      const inProgress = enrollments.filter(e => e.status === "active" && (e.progress || 0) < 100).length || 0;
      const completed = enrollments.filter(e => (e.progress || 0) >= 100).length || 0;
      const upcoming = assignments.filter((a: any) => a.status === "pending").length || 0;
      const totalActivity = (progress?.length || 0) + (assignments?.length || 0);

      setStats({
        totalActivity,
        inProgress,
        completed,
        upcoming
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  const updateStats = async (field: string, value: number) => {
    try {
      await apiFetch("/dashboard/stats", {
        method: "PATCH",
        body: JSON.stringify({ [field]: value })
      });
      setStats({ ...stats, [field]: value });
    } catch (error: any) {
      toast.error("Failed to update stats");
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
          {isEditMode ? (
            <Input
              type="number"
              value={stats.totalActivity}
              onChange={(e) => updateStats("total_activity", parseInt(e.target.value))}
              className="w-24 h-12 text-4xl font-bold"
            />
          ) : (
            <div className="text-4xl font-bold">{stats.totalActivity}%</div>
          )}
        </Card>

        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-muted-foreground">In Progress</h3>
            <AlertCircle className="h-4 w-4 text-primary" />
          </div>
          {isEditMode ? (
            <Input
              type="number"
              value={stats.inProgress}
              onChange={(e) => updateStats("in_progress", parseInt(e.target.value))}
              className="w-20 text-center"
            />
          ) : (
            <div className="text-4xl font-bold">{stats.inProgress}</div>
          )}
        </Card>

        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-muted-foreground">Completed</h3>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          {isEditMode ? (
            <Input
              type="number"
              value={stats.completed}
              onChange={(e) => updateStats("completed", parseInt(e.target.value))}
              className="w-20 text-center"
            />
          ) : (
            <div className="text-4xl font-bold">{stats.completed}</div>
          )}
        </Card>

        <Card className="p-6 bg-gradient-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-muted-foreground">Total Courses</h3>
            <BookOpen className="h-4 w-4 text-accent" />
          </div>
          <div className="text-4xl font-bold">{courses.length}</div>
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
                    <Button className="w-full bg-gradient-primary">
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
