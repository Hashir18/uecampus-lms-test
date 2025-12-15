import { useEffect, useState } from "react";
import { AlertCircle, Calendar, Clock, TrendingUp, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";

interface Deadline {
  id: string;
  title: string;
  course: string;
  due_date: string;
  priority: string;
  hours_left: number;
  type?: 'assignment' | 'quiz';
}

export function RightSidebar() {
  const { user } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [stats, setStats] = useState({
    studyTime: "0h 0m",
    completedTasks: 0,
    streak: 0,
  });

  useEffect(() => {
    if (user) {
      fetchDeadlines();
      fetchStats();
    }
  }, [user]);

  const fetchDeadlines = async () => {
    try {
      if (!user) return;

      const data = await apiFetch<{ assignments: any[]; quizzes: any[] }>("/feed/upcoming");

      const assignmentDeadlines =
        (data.assignments || []).map((a) => {
          const deadline = a.custom_deadline || a.due_date;
          if (!deadline) return null;
          const dueDate = new Date(deadline);
          const now = new Date();
          const hoursLeft = Math.max(
            0,
            Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60))
          );
          return {
            id: `assignment-${a.id}`,
            title: a.title,
            course: a.course || a.course_id || "",
            due_date: deadline,
            priority: a.priority || "medium",
            hours_left: hoursLeft,
            type: "assignment" as const,
          };
        }).filter(Boolean) as Deadline[];

      const quizDeadlines =
        (data.quizzes || []).map((q) => {
          const deadline = q.custom_deadline || q.due_date;
          if (!deadline) return null;
          const dueDate = new Date(deadline);
          const now = new Date();
          const hoursLeft = Math.max(
            0,
            Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60))
          );
          return {
            id: `quiz-${q.id}`,
            title: q.title,
            course: q.course_id || "",
            due_date: deadline,
            priority: hoursLeft < 24 ? "high" : hoursLeft < 72 ? "medium" : "low",
            hours_left: hoursLeft,
            type: "quiz" as const,
          };
        }).filter(Boolean) as Deadline[];

      const allDeadlines = [...assignmentDeadlines, ...quizDeadlines].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );

      setDeadlines(allDeadlines);
    } catch (error) {
      console.error("Error fetching deadlines:", error);
    }
  };

  const fetchStats = async () => {
    try {
      if (!user) return;

      const [todayData, progressData] = await Promise.all([
        apiFetch<any[]>("/feed/today"),
        apiFetch<any[]>("/progress"),
      ]);

      const todayProgress = todayData || [];
      const allProgress = progressData?.filter((p) => p.status === "completed") || [];

      const dateSet = new Set<string>();
      (allProgress || []).forEach((item) => {
        if (!item.completed_at) return;
        const date = new Date(item.completed_at);
        dateSet.add(date.toISOString().split("T")[0]);
      });
      const sortedDates = Array.from(dateSet).sort().reverse();
      let streak = 0;
      if (sortedDates.length) {
        let currentDate = new Date();
        const todayStr = currentDate.toISOString().split("T")[0];
        if (!sortedDates.includes(todayStr)) {
          currentDate.setDate(currentDate.getDate() - 1);
        }
        for (const dateStr of sortedDates) {
          const checkDateStr = currentDate.toISOString().split("T")[0];
          if (dateStr === checkDateStr) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else if (new Date(dateStr) < currentDate) {
            break;
          }
        }
      }

      const totalMinutes = (allProgress?.length || 0) * 30;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setStats({
        studyTime: `${hours}h ${minutes}m`,
        completedTasks: todayProgress?.length || 0,
        streak,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Today's Stats */}
        <div className="bg-gradient-hero p-4 rounded-lg shadow-glow">
          <h2 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            Today's Activity
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-card/50 rounded backdrop-blur-sm">
              <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Study Time</p>
              <p className="text-sm font-bold">{stats.studyTime}</p>
            </div>
            <div className="text-center p-2 bg-card/50 rounded backdrop-blur-sm">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" />
              <p className="text-xs text-muted-foreground">Tasks</p>
              <p className="text-sm font-bold">{stats.completedTasks}</p>
            </div>
            <div className="text-center p-2 bg-card/50 rounded backdrop-blur-sm">
              <span className="text-xl">🔥</span>
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="text-sm font-bold">{stats.streak} days</p>
            </div>
          </div>
        </div>

        {/* Urgent Deadlines */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Upcoming Deadlines
          </h2>
          <div className="space-y-3">
            {deadlines.length === 0 ? (
              <Card className="p-4 text-center text-muted-foreground">
                <p className="text-sm">No upcoming deadlines</p>
              </Card>
            ) : (
              deadlines.map((deadline) => (
                <Card
                  key={deadline.id}
                  className={cn(
                    "p-4 border-l-4 transition-all duration-300 hover:shadow-glow hover:scale-105 bg-gradient-card",
                    deadline.priority === "high" && "border-l-destructive shadow-glow-accent",
                    deadline.priority === "medium" && "border-l-warning",
                    deadline.priority === "low" && "border-l-success"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {deadline.type === 'quiz' && (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-purple-600 text-white mb-1">
                            Quiz
                          </Badge>
                        )}
                        {deadline.type === 'assignment' && (
                          <Badge variant="destructive" className="text-[10px] h-5 mb-1">
                            Assignment
                          </Badge>
                        )}
                        <h3 className="font-medium text-sm leading-tight">{deadline.title}</h3>
                      </div>
                      <Badge
                        variant={deadline.priority === "high" ? "destructive" : "secondary"}
                        className={deadline.priority === "high" ? "animate-pulse" : ""}
                      >
                        {deadline.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{deadline.course}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                       <span className="text-muted-foreground">
                        {deadline.due_date
                          ? (() => {
                              const utcDate = new Date(deadline.due_date);
                              // Convert UTC to UAE time (UTC+4)
                              const uaeDate = new Date(utcDate.getTime() + (4 * 60 * 60 * 1000));
                              return format(uaeDate, "MMM d, h:mm a");
                            })()
                          : "No date"}
                      </span>
                      <span
                        className={cn(
                          "ml-auto font-semibold",
                          deadline.hours_left < 24 && "text-destructive",
                          deadline.hours_left >= 24 && deadline.hours_left < 72 && "text-warning",
                          deadline.hours_left >= 72 && "text-success"
                        )}
                      >
                        {deadline.hours_left}h left
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
