import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Search, Settings, User, ChevronLeft, ChevronRight, Edit2, Save, LogOut, Moon, Sun, Cake } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "./NotificationBell";
import { useBirthdayMode } from "@/hooks/useBirthdayMode";
import { BirthdayCelebration } from "@/components/BirthdayCelebration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const { isEditMode, toggleEditMode, isAdmin } = useEditMode();
  const { user, loading, status, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { birthdayMode, setBirthdayModeForCurrentUser } = useBirthdayMode();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserBirthdayMode, setSelectedUserBirthdayMode] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, user]);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch<any[]>("/users");
      if (data) {
        setUsers(user ? data.filter((u) => u.id !== user.id) : data);
      }
    } catch {
      setUsers([]);
    }
  };

  const toggleBirthdayMode = async (userId: string, enabled: boolean) => {
    try {
      const res = await apiFetch<{ birthday_mode: boolean }>("/preferences/birthday-mode", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, birthday_mode: enabled }),
      });

      if (userId === selectedUserId) {
        setSelectedUserBirthdayMode(res.birthday_mode);
      }

      if (user && userId === user.id) {
        if (enabled) {
          document.documentElement.classList.add("birthday-mode");
        } else {
          document.documentElement.classList.remove("birthday-mode");
        }
        toast.success("Your birthday mode updated");
      } else {
        toast.success("User birthday mode updated");
      }
    } catch (error) {
      console.error("Failed to update birthday mode", error);
      toast.error("Failed to update birthday mode");
    }
  };

  useEffect(() => {
    if (status === "checking") return;
    if (!user) {
      signOut();
    }
  }, [user, status, signOut]);

  const handleEditModeToggle = () => {
    if (!isAdmin) {
      toast.error("Only admins can enable edit mode");
      return;
    }
    
    toggleEditMode();
    if (!isEditMode) {
      toast.info("Edit Mode Enabled - All content is now editable");
    } else {
      toast.success("Edit Mode Disabled - Changes saved");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Birthday Celebration Component */}
      <BirthdayCelebration />
      
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 shadow-lg">
        <div className="flex h-16 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="hover:bg-primary/20 hover:text-primary transition-all duration-300"
            aria-label="Toggle navigation menu"
          >
            {leftSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1 flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EduPro LMS
            </h1>
            
            <div className="hidden md:flex flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses, assignments..."
                  className="pl-10 bg-muted/50 border-border/50 focus:border-primary transition-all duration-300"
                  aria-label="Search"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:bg-primary/20 hover:text-primary transition-all duration-300"
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <NotificationBell />
            
            {/* Settings Dropdown with Edit Mode */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-primary/20 hover:text-primary transition-all duration-300 relative"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                  {isEditMode && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-success rounded-full" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span>Settings</span>
                  <div className="flex items-center gap-2">
                    {isEditMode && <Badge variant="outline" className="text-xs">EDITING</Badge>}
                    {isAdmin && <Badge className="text-xs bg-primary">ADMIN</Badge>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={handleEditModeToggle} className="cursor-pointer">
                      {isEditMode ? (
                        <>
                          <Save className="mr-2 h-4 w-4 text-success" />
                          <span>Save & Exit Edit Mode</span>
                        </>
                      ) : (
                        <>
                          <Edit2 className="mr-2 h-4 w-4 text-primary" />
                          <span>Enable Edit Mode</span>
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    
                    {/* Admin's own Birthday Mode */}
                    <div className="px-2 py-2">
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Cake className="h-4 w-4" />
                        My Birthday Mode
                      </Label>
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="admin-birthday-mode" className="text-xs cursor-pointer">
                          Enable for yourself
                        </Label>
                        <Switch
                          id="admin-birthday-mode"
                          checked={birthdayMode}
                          onCheckedChange={setBirthdayModeForCurrentUser}
                        />
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* Birthday Mode Control for Users */}
                    <div className="px-2 py-2">
                      <Label className="text-sm font-medium mb-2 block">Manage User Birthday Mode</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger className="w-full mb-2">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedUserId && (
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="user-birthday-mode" className="text-xs cursor-pointer">
                            {selectedUserBirthdayMode ? "Disable" : "Enable"} Birthday Mode
                          </Label>
                          <Switch
                            id="user-birthday-mode"
                            checked={selectedUserBirthdayMode}
                            onCheckedChange={(checked) => toggleBirthdayMode(selectedUserId, checked)}
                          />
                        </div>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile: {user?.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-primary/20 hover:text-primary transition-all duration-300"
              aria-label="Profile"
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="hover:bg-accent/20 hover:text-accent transition-all duration-300"
              aria-label="Toggle alerts sidebar"
            >
              {rightSidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <aside
          className={`transition-all duration-500 ease-smooth ${
            leftSidebarOpen ? "w-64" : "w-0"
          } overflow-hidden border-r border-border/50 bg-sidebar shadow-2xl relative z-10`}
          aria-label="Main navigation"
        >
          <LeftSidebar />
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          {/* Background decorative elements */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside
          className={`transition-all duration-500 ease-smooth ${
            rightSidebarOpen ? "w-80" : "w-0"
          } overflow-hidden border-l border-border/50 bg-card shadow-2xl relative z-10`}
          aria-label="Alerts and deadlines"
        >
          <RightSidebar />
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-bl from-accent/5 to-transparent pointer-events-none" />
        </aside>

        {/* Overlay for mobile when sidebars are open */}
        {(leftSidebarOpen || rightSidebarOpen) && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-0 lg:hidden"
            onClick={() => {
              setLeftSidebarOpen(false);
              setRightSidebarOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
