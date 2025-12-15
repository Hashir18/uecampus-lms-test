import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Search, Plus, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

interface Course {
  id: string;
  title: string;
  code: string;
  category: string;
  description: string;
  duration: string;
}

export default function Courses() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    duration: "",
    category: "",
    code: ""
  });
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    if (!user) return;
    loadCourses();
  }, [user, isAdmin]);

  const loadCourses = async () => {
    if (!user) return;
    // Always try full list first; if it fails, fall back to enrolled-only
    const tryPaths = ["/courses", "/courses?enrolledOnly=true"];
    for (const path of tryPaths) {
      try {
        const data = await apiFetch<Course[]>(path);
        if (Array.isArray(data)) {
          setCourses(data);
          return;
        }
      } catch (error) {
        // try next path
        console.warn("Course fetch failed for", path, error);
      }
    }
    toast.error("Failed to load courses");
  };

  const handleAddCourse = async () => {
    if (!newCourse.title || !newCourse.category || !newCourse.duration) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const courseCode = newCourse.code || `${newCourse.category.substring(0, 3).toUpperCase()}-${Date.now()}`;
      const created = await apiFetch<{ id: string }>("/courses", {
        method: "POST",
        body: {
          title: newCourse.title,
          code: courseCode,
          category: newCourse.category,
          duration: newCourse.duration,
          description: newCourse.title
        }
      });

      // Upload attachments if any
      if (attachments.length > 0 && created?.id) {
        for (const file of attachments) {
          const fd = new FormData();
          fd.append("course_id", created.id);
          fd.append("title", file.name);
          fd.append("file", file);
          await apiFetch("/materials", { method: "POST", body: fd }).catch(() => {});
        }
      }

      toast.success("Course added successfully");
      setAddDialogOpen(false);
      setNewCourse({ title: "", duration: "", category: "", code: "" });
      setAttachments([]);
      loadCourses();
    } catch (error: any) {
      toast.error(error.message || "Failed to add course");
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Course Catalog</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Manage your courses" : "Browse all available courses"}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Course Name *</Label>
                  <Input
                    value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    placeholder="e.g., Bachelor of Science in Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <Input
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                    placeholder="e.g., 4 years"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Category *</Label>
                  <Select value={newCourse.category} onValueChange={(val) => setNewCourse({ ...newCourse, category: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor's">Bachelor's Degree</SelectItem>
                      <SelectItem value="Master's">Master's Degree</SelectItem>
                      <SelectItem value="Doctorate">Doctorate</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Course Code (Optional)</Label>
                  <Input
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    placeholder="e.g., CS-101"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attachments (Optional)</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                  />
                  {attachments.length > 0 && (
                    <p className="text-sm text-muted-foreground">{attachments.length} file(s) selected</p>
                  )}
                </div>
                <Button onClick={handleAddCourse} className="w-full">Add Course</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCourses.map(course => (
          <Link key={course.id} to={`/courses/${course.id}`}>
            <Card className="h-full p-6 hover:shadow-xl transition-all">
              <Badge className="mb-2">{course.category}</Badge>
              <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{course.code}</p>
              <div className="text-xs text-muted-foreground mb-4">
                Duration: {course.duration}
              </div>
              <Button className="w-full">View Details</Button>
            </Card>
          </Link>
        ))}
        {filteredCourses.length === 0 && (
          <Card className="p-12 text-center col-span-full">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground">
              {isAdmin ? "Add your first course to get started" : "You haven't been enrolled yet"}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
