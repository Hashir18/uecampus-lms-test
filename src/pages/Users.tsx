import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Users as UsersIcon, UserPlus, Lock, Ban, LogIn, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";

const userSchema = z.object({
  email: z.string().email("Invalid email address").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().trim().min(1, "Name is required"),
  role: z.enum(["admin", "teacher", "non_editing_teacher", "student", "accounts"]),
});

interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  is_blocked: boolean;
  user_id: string | null;
}

interface Cohort {
  id: string;
  name: string;
  description: string;
  member_count: number;
}

export default function Users() {
  const { user, isAdmin, login, refresh } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    user_id: "",
    email: "",
    password: "",
    full_name: "",
    role: "student",
    course_id: "",
  });
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    role: "student",
  });

  useEffect(() => {
    if (!user) return;
    // Page is already admin-protected by routing, so load immediately.
    loadUsers();
    loadCohorts();
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    const paths = ["/courses", "/courses?enrolledOnly=true"];
    for (const path of paths) {
      try {
        const data = await apiFetch<any[]>(path);
        if (Array.isArray(data)) {
          setCourses(data);
          return;
        }
      } catch (e) {
        // try next path
      }
    }
    setCourses([]);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any[]>("/users");
      const usersWithRoles =
        (Array.isArray(data) ? data : []).map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name || "",
          roles: u.roles || [],
          is_blocked: !!u.is_blocked,
          user_id: u.user_code || "",
        })) || [];
      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error(error?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCohorts = async () => {
    setCohorts([]); // Cohorts not supported in PHP backend yet
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id) {
      toast.error("User ID is required");
      return;
    }
    try {
      const validated = userSchema.parse(formData);
      await apiFetch("/users", {
        method: "POST",
        body: {
          email: validated.email,
          password: validated.password,
          full_name: validated.full_name,
          role: validated.role,
          user_id: formData.user_id,
          course_id: formData.course_id || null,
        },
      });
      toast.success("User created successfully");
      setDialogOpen(false);
      setFormData({ user_id: "", email: "", password: "", full_name: "", role: "student", course_id: "" });
      loadUsers();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create user");
      }
    }
  };

  const handleDeleteUser = async (_userId: string) => {
    toast.error("Delete user is not implemented yet in PHP backend");
  };

  const handleToggleBlock = async (target: User) => {
    try {
      await apiFetch(`/users/${target.id}`, {
        method: "PATCH",
        body: {
          is_blocked: !target.is_blocked,
        },
      });
      toast.success(target.is_blocked ? "User unblocked" : "User blocked");
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user status");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error("Select a user and enter a new password");
      return;
    }
    try {
      await apiFetch(`/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        body: { new_password: newPassword },
      });
      toast.success("Password reset successfully");
      setPasswordDialogOpen(false);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to reset password");
    }
  };

  const handleImpersonate = async (target: User) => {
    try {
      const res = await apiFetch<{ token: string }>(`/users/${target.id}/impersonate`, { method: "POST" });
      if (!res?.token) throw new Error("No token returned");
      await login(res.token);
      await refresh({ force: true });
      toast.success(`Logged in as ${target.full_name || target.email}`);
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast.error(error?.message || "Failed to impersonate user");
    }
  };

  const handleEditUser = (target: User) => {
    setSelectedUser(target);
    setEditFormData({
      full_name: target.full_name,
      email: target.email,
      role: target.roles[0] || "student",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await apiFetch(`/users/${selectedUser.id}`, {
        method: "PATCH",
        body: {
          full_name: editFormData.full_name,
          role: editFormData.role,
        },
      });
      toast.success("User updated");
      setEditDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and cohorts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">User ID *</Label>
                <Input
                  id="user_id"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  placeholder="e.g., 001, 002"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (alphanumeric). Once assigned, cannot be changed or reused.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="non_editing_teacher">Non-editing Teacher</SelectItem>
                    <SelectItem value="accounts">Accounts</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="course">Enroll in Course (Optional)</Label>
                <Select value={formData.course_id} onValueChange={(value) => setFormData({ ...formData, course_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={courses.length === 0 ? "No courses found" : "Select a course"} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create User</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_user_id">User ID</Label>
              <Input
                id="edit_user_id"
                value={selectedUser?.user_id || "Not set"}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                User ID cannot be changed once assigned
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                value={editFormData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed (linked to authentication)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_role">Role</Label>
              <Select value={editFormData.role} onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="non_editing_teacher">Non-editing Teacher</SelectItem>
                  <SelectItem value="accounts">Accounts</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setEditDialogOpen(false);
                  setPasswordDialogOpen(true);
                }}
              >
                <Lock className="h-4 w-4" />
                Reset Password
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateUser} className="flex-1">
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset password for: <strong>{selectedUser?.full_name}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <Button onClick={handleResetPassword} className="w-full">
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <UsersIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{user.full_name}</h3>
                          {user.is_blocked && (
                            <Badge variant="destructive" className="text-xs">
                              Blocked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.user_id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {user.user_id}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="secondary">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        title="Edit user"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setPasswordDialogOpen(true);
                        }}
                        title="Reset password"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleBlock(user)}
                        title={user.is_blocked ? "Unblock user" : "Block user"}
                        className={user.is_blocked ? "text-green-600" : "text-orange-600"}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleImpersonate(user)}
                        title="Login as this user"
                        className="text-blue-600"
                      >
                        <LogIn className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Cohort Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cohort management features coming soon. You'll be able to create cohorts and automatically enroll groups of users.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
