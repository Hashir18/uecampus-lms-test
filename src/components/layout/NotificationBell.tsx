import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: string;
  type: "assignment" | "deadline" | "announcement";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const data = await apiFetch<{ assignments: any[]; quizzes: any[] }>("/feed/upcoming");
      const notifs: Notification[] = [];

      (data.assignments || []).slice(0, 5).forEach((assignment) => {
        if (!assignment.due_date && !assignment.custom_deadline) return;
        const due = assignment.custom_deadline || assignment.due_date;
        const daysUntil = Math.ceil(
          (new Date(due).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        notifs.push({
          id: assignment.id,
          type: "deadline",
          title: "Assignment Due Soon",
          message: `${assignment.title} is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          created_at: assignment.created_at || new Date().toISOString(),
          read: false,
        });
      });

      (data.quizzes || []).slice(0, 3).forEach((quiz) => {
        if (!quiz.due_date && !quiz.custom_deadline) return;
        const due = quiz.custom_deadline || quiz.due_date;
        const daysUntil = Math.ceil(
          (new Date(due).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        notifs.push({
          id: `quiz-${quiz.id}`,
          type: "deadline",
          title: "Quiz Due Soon",
          message: `${quiz.title} is due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
          created_at: quiz.created_at || new Date().toISOString(),
          read: false,
        });
      });

      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch (error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-primary/20 hover:text-primary transition-all duration-300 relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} new</Badge>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    notification.type === "deadline" ? "bg-destructive" :
                    notification.type === "assignment" ? "bg-primary" :
                    "bg-accent"
                  }`} />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
