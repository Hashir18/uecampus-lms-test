import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Video, Upload, Trash2, Youtube, Play } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface CourseGuide {
  id: string;
  course_id: string;
  title: string;
  description: string;
  guide_type: "video" | "youtube";
  file_path: string | null;
  youtube_url: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  created_at: string;
  courses?: {
    title: string;
    code: string;
  };
}

export default function CourseGuides({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const [guides, setGuides] = useState<CourseGuide[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<CourseGuide | null>(null);
  const [formData, setFormData] = useState({
    course_id: "",
    title: "",
    description: "",
    guide_type: "youtube" as "video" | "youtube",
    file: null as File | null,
    youtube_url: "",
    duration: "",
  });

  useEffect(() => {
    if (user) {
      loadCourses();
      loadGuides();
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

  const loadGuides = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CourseGuide[]>("/course-guides");
      setGuides((data as any) || []);
    } catch (error) {
      console.error("Error loading course guides:", error);
      toast.error("Failed to load course guides");
    } finally {
      setLoading(false);
    }
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("video/")) {
        toast.error("Please upload a video file");
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.course_id) {
      toast.error("Please select a course");
      return;
    }

    if (formData.guide_type === "youtube" && !formData.youtube_url) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    if (formData.guide_type === "video" && !formData.file) {
      toast.error("Please select a video file");
      return;
    }

    setUploading(true);
    try {
      let thumbnailUrl = null;
      if (formData.guide_type === "youtube") {
        const videoId = extractYouTubeId(formData.youtube_url);
        if (!videoId) {
          toast.error("Invalid YouTube URL");
          return;
        }
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }

      const body = new FormData();
      body.append("course_id", formData.course_id);
      body.append("title", formData.title);
      body.append("description", formData.description);
      body.append("guide_type", formData.guide_type);
      body.append("youtube_url", formData.guide_type === "youtube" ? formData.youtube_url : "");
      if (thumbnailUrl) body.append("thumbnail_url", thumbnailUrl);
      if (formData.duration) body.append("duration", formData.duration);
      if (formData.guide_type === "video" && formData.file) {
        body.append("file", formData.file);
      }

      await apiFetch("/course-guides", { method: "POST", body });

      toast.success("Guide uploaded successfully");
      setDialogOpen(false);
      setFormData({
        course_id: "",
        title: "",
        description: "",
        guide_type: "youtube",
        file: null,
        youtube_url: "",
        duration: "",
      });
      loadGuides();
    } catch (error: any) {
      console.error("Error uploading guide:", error);
      toast.error(error.message || "Failed to upload guide");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (guide: CourseGuide) => {
    if (!confirm("Are you sure you want to delete this guide?")) return;

    try {
      await apiFetch(`/course-guides/${guide.id}`, { method: "DELETE" });

      toast.success("Guide deleted successfully");
      loadGuides();
    } catch (error: any) {
      console.error("Error deleting guide:", error);
      toast.error(error.message || "Failed to delete guide");
    }
  };

  const handleView = async (guide: CourseGuide) => {
    if (guide.guide_type === "youtube") {
      setSelectedGuide(guide);
    } else if (guide.file_path) {
      try {
        const res = await apiFetch<{ url: string }>(`/course-guides/${guide.id}/signed-url`);
        setSelectedGuide({ ...guide, file_path: res.url });
      } catch {
        toast.error("Failed to open video");
      }
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
          <h2 className="text-2xl font-semibold">Course-Specific Learning Guides</h2>
          <p className="text-sm text-muted-foreground">
            Video tutorials for your enrolled courses
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Add Guide
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Course Learning Guide</DialogTitle>
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
                  <Label>Guide Type *</Label>
                  <RadioGroup
                    value={formData.guide_type}
                    onValueChange={(value: "video" | "youtube") =>
                      setFormData({ ...formData, guide_type: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="youtube" id="youtube" />
                      <Label htmlFor="youtube">YouTube Video</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="video" id="video" />
                      <Label htmlFor="video">Upload Video File</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
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

                {formData.guide_type === "youtube" ? (
                  <div className="space-y-2">
                    <Label>YouTube URL *</Label>
                    <Input
                      type="url"
                      value={formData.youtube_url}
                      onChange={(e) =>
                        setFormData({ ...formData, youtube_url: e.target.value })
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Upload Video File *</Label>
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    placeholder="e.g., 30"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? "Adding..." : "Add Guide"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {guides.length === 0 ? (
        <div className="text-center py-12">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No course guides available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map((guide) => (
            <Card key={guide.id} className="border-border/50 hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-0">
                <div className="relative w-full h-48 bg-muted flex items-center justify-center">
                  {guide.thumbnail_url ? (
                    <img
                      src={guide.thumbnail_url}
                      alt={guide.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="h-16 w-16 text-white" />
                  </div>
                  {guide.guide_type === "youtube" && (
                    <div className="absolute top-2 right-2">
                      <Youtube className="h-6 w-6 text-red-500 bg-white rounded" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold line-clamp-2">{guide.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {guide.courses?.code || ""} {guide.courses ? "-" : ""} {guide.courses?.title || ""}
                    </p>
                    {guide.duration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Duration: {guide.duration} minutes
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleView(guide)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Watch
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(guide)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedGuide} onOpenChange={() => setSelectedGuide(null)}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedGuide?.title}</DialogTitle>
          </DialogHeader>
          {selectedGuide && (
            <div className="flex-1 overflow-hidden">
              {selectedGuide.guide_type === "youtube" && selectedGuide.youtube_url ? (
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(
                    selectedGuide.youtube_url
                  )}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedGuide.title}
                />
              ) : (
                <video
                  src={selectedGuide.file_path || ""}
                  controls
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
