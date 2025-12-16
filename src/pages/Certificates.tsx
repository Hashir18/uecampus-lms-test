import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Award, Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiFetch, getAuthToken } from "@/lib/api";

interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  file_url?: string;
}

export default function Certificates() {
  const { user, isAdmin } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadCourse, setUploadCourse] = useState("");
  const [uploadUser, setUploadUser] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadCertificates(isAdmin);
      if (isAdmin) {
        loadCoursesAndUsers();
      }
    }
  }, [user, isAdmin]);

  const loadCoursesAndUsers = async () => {
    try {
      const [coursesData, usersData] = await Promise.all([
        apiFetch<any[]>("/courses"),
        apiFetch<any[]>("/users"),
      ]);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadCertificates = async (adminFlag?: boolean) => {
    if (!user) return;
    try {
      const data = await apiFetch<Certificate[]>(`/certificates${adminFlag ? "?all=1" : ""}`);
      setCertificates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load certificates");
      setCertificates([]);
    }
  };

  const handleUploadCertificate = async () => {
    if (!uploadCourse || !uploadUser || !uploadFile) {
      toast.error("Select user, course, and a file");
      return;
    }
    setUploading(true);
    try {
      const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const form = new FormData();
      form.append("user_id", uploadUser);
      form.append("course_id", uploadCourse);
      form.append("certificate_number", certNumber);
      form.append("file", uploadFile);
      await apiFetch("/certificates", { method: "POST", body: form });
      toast.success("Certificate uploaded");
      setUploadDialogOpen(false);
      setUploadCourse("");
      setUploadUser("");
      setUploadFile(null);
      loadCertificates(isAdmin);
    } catch (error: any) {
      toast.error(error?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/certificates/${id}`, { method: "DELETE" });
      setCertificates((prev) => prev.filter((c) => c.id !== id));
      toast.success("Certificate deleted");
    } catch (error: any) {
      toast.error(error?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Certificates</h1>
          <p className="text-muted-foreground mt-1">
            View and download your course completion certificates
          </p>
        </div>
        {isAdmin && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Certificate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Certificate</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Select User</p>
                  <Select value={uploadUser} onValueChange={setUploadUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium">Select Course</p>
                  <Select value={uploadCourse} onValueChange={setUploadCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium">Certificate File</p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="mt-1 block w-full text-sm text-muted-foreground"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button onClick={handleUploadCertificate} className="w-full" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Certificate"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
            <p className="text-muted-foreground">
              Upload a certificate to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {certificates.map((cert) => {
            const token = getAuthToken();
            const fileUrl = token && cert.file_url
              ? `${cert.file_url}${cert.file_url.includes("?") ? "&" : "?"}token=${token}`
              : cert.file_url;
            return (
              <Card key={cert.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Certificate</p>
                      <p className="font-semibold">{cert.certificate_number}</p>
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button variant="ghost" className="text-destructive" onClick={() => handleDelete(cert.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                      {fileUrl && (
                        <Button variant="outline" onClick={() => window.open(fileUrl, "_blank")}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                  {fileUrl ? (
                    <div className="border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center">
                      {fileUrl.match(/\.pdf($|\?)/i) ? (
                        <iframe src={fileUrl} className="w-full h-[500px] border-0" title="Certificate file" />
                      ) : (
                        <img src={fileUrl} alt="Certificate" className="max-h-[600px] w-full object-contain bg-background" />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No file attached.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
