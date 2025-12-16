import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BookOpen, Upload, Trash2, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CourseBook {
  id: string;
  course_id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  cover_image_url: string | null;
  created_at: string;
  courses?: {
    title: string;
    code: string;
  };
}

export default function CourseBooks({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<CourseBook[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<CourseBook | null>(null);
  const [formData, setFormData] = useState({
    course_id: "",
    title: "",
    description: "",
    file: null as File | null,
  });

  useEffect(() => {
    if (user) {
      loadCourses();
      loadBooks();
    }
  }, [user]);

  const loadCourses = async () => {
    try {
      const data = await apiFetch<any[]>(`/courses${isAdmin ? "" : "?enrolledOnly=true"}`);
      setCourses(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CourseBook[]>("/course-books");
      setBooks(data || []);
    } catch (error) {
      console.error("Error loading course books:", error);
      toast.error("Failed to load course books");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = [
        "application/pdf",
        "application/epub+zip",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload PDF, EPUB, PPT, or PPTX files only");
        return;
      }

      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.file || !formData.course_id) {
      toast.error("Please select a course and file");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("course_id", formData.course_id);
      body.append("title", formData.title);
      if (formData.description) body.append("description", formData.description);
      body.append("file", formData.file);

      await apiFetch("/course-books", { method: "POST", body });

      toast.success("Book uploaded successfully");
      setDialogOpen(false);
      setFormData({ course_id: "", title: "", description: "", file: null });
      loadBooks();
    } catch (error: any) {
      console.error("Error uploading book:", error);
      toast.error(error.message || "Failed to upload book");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (book: CourseBook) => {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      await apiFetch(`/course-books/${book.id}`, { method: "DELETE" });

      toast.success("Book deleted successfully");
      loadBooks();
    } catch (error: any) {
      console.error("Error deleting book:", error);
      toast.error(error.message || "Failed to delete book");
    }
  };

  const handleView = async (book: CourseBook) => {
    try {
      const res = await apiFetch<{ url: string }>(`/course-books/${book.id}/signed-url`);
      if (res.url) {
        setSelectedBook({ ...book, file_path: res.url });
      }
    } catch (error) {
      console.error("Error viewing book:", error);
      toast.error("Failed to open book");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Course-Specific Books</h2>
          <p className="text-sm text-muted-foreground">
            Books available for your enrolled courses
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Book
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Course Book</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Course *</Label>
                  <Select
                    value={formData.course_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, course_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} - {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Book Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upload File (PDF, EPUB, PPT, PPTX) *</Label>
                  <Input
                    type="file"
                    accept=".pdf,.epub,.ppt,.pptx"
                    onChange={handleFileChange}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Book"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {books.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No course books available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <Card key={book.id} className="border-border/50 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-2">{book.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {book.courses?.code || ""} {book.courses ? "-" : ""} {book.courses?.title || ""}
                    </p>
                    {book.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {book.description}
                      </p>
                    )}
                  </div>
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(book)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(book)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedBook?.title}</DialogTitle>
          </DialogHeader>
          {selectedBook && (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                  selectedBook.file_path
                )}&embedded=true`}
                className="w-full h-full border-0"
                title={selectedBook.title}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
