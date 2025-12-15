import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [userName, setUserName] = useState("Student");

  useEffect(() => {
    if (user?.full_name) {
      setUserName(user.full_name);
    }

    // Show welcome dialog after a short delay on first visit
    const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");
    if (!hasSeenWelcome && user) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("hasSeenWelcome", "true");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md border-primary/50 bg-gradient-hero shadow-glow">
        <DialogHeader className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center animate-bounce">
                <span className="text-lg">🎉</span>
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Welcome, {userName}!
          </DialogTitle>
          
          <p className="text-foreground text-lg">
            Ready to continue your learning journey?
          </p>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
