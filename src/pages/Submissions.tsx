import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Award, Download, Sparkles, FileText } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";

interface Assignment {
  id: string;
  title: string;
  course: string;
  course_code?: string;
  due_date?: string | null;
  points: number | null;
  passing_marks: number | null;
  assessment_brief: string | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  file_path: string | null;
  submitted_at: string | null;
  marks_obtained: number | null;
  graded_at: string | null;
  feedback: string | null;
  status: string | null;
  user_name?: string;
  user_email?: string;
  assignment_title?: string;
}

export default function Submissions() {
  const { user, isAdmin, isTeacher } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [courses, setCourses] = useState<Array<{id: string; name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"marked" | "unmarked">("unmarked");
  const [gradingDialog, setGradingDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<{ assignment: Assignment; submission: Submission } | null>(null);
  const [gradeData, setGradeData] = useState({ marks: "", feedback: "", comments: "" });
  const [filePreview, setFilePreview] = useState<string>("");
  const [isAutoGrading, setIsAutoGrading] = useState(false);

  useEffect(() => {
    if (user && (isAdmin || isTeacher)) {
      fetchData();
    }
  }, [user, selectedCourse, selectedStudent, isAdmin, isTeacher, viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const courseQuery = selectedCourse !== "all" ? `?courseId=${selectedCourse}` : "";
      const [coursesData, assignmentsData, submissionsData, usersData] = await Promise.all([
        apiFetch<{ id: string; title: string; code: string }[]>("/courses"),
        apiFetch<Assignment[]>("/assignments"),
        apiFetch<Submission[]>(`/submissions${courseQuery}`),
        apiFetch<any[]>("/users"),
      ]);

      const coursesMap = new Map(
        (coursesData || []).map((c) => [c.id, { title: c.title, code: c.code }])
      );

      const usersMap = new Map(usersData?.map((u) => [u.id, u]) || []);
      setAllUsers(usersData || []);

      // Start with assignments from API
      const assignmentsList = assignmentsData ? [...assignmentsData] : [];

      const submissionsWithUserInfo =
        submissionsData?.map((sub: any) => {
          const userProfile = usersMap.get(sub.user_id);
          let assignment = assignmentsList.find((a) => a.id === sub.assignment_id);

          // If assignment not found (edge case), create a placeholder so it renders
          if (!assignment) {
            assignment = {
              id: sub.assignment_id,
              title: sub.assignment_title || "Unknown Assignment",
              course: "",
              course_code: "",
              points: sub.points ?? null,
              due_date: null,
              passing_marks: null,
              assessment_brief: null,
            } as any;
            assignmentsList.push(assignment as Assignment);
          }

          const courseMeta = coursesMap.get(assignment?.course || "");
          return {
            ...sub,
            user_name: userProfile?.full_name || "Unknown User",
            user_email: userProfile?.email || "No email",
            assignment_title: assignment?.title || sub.assignment_title,
            course_code: assignment?.course_code || courseMeta?.code,
            points: assignment?.points ?? sub.points,
          };
        }) || [];

      // Apply course filter to assignments and derive dropdown options
      const filteredAssignments =
        assignmentsList.filter((a) => selectedCourse === "all" || a.course === selectedCourse) || [];
      setAssignments(filteredAssignments);

      // Build course list from assignments; if none, fall back to all courses
      const uniqueCourseIds = [...new Set(assignmentsList.map((a) => a.course).filter(Boolean))];
      const courseList = uniqueCourseIds.length
        ? uniqueCourseIds.map((id) => {
            const course = coursesMap.get(id);
            return {
              id,
              name: course ? `${course.title}` : id,
            };
          })
        : Array.from(coursesMap.entries()).map(([id, meta]) => ({
            id,
            name: meta.title || id,
          }));
      setCourses(courseList);

      setSubmissions(submissionsWithUserInfo);
      setLoading(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch data");
      setLoading(false);
    }
  };

  const handleGrade = async (assignment: Assignment, submission: Submission) => {
    setSelectedSubmission({ assignment, submission });
    setGradeData({ 
      marks: submission.marks_obtained?.toString() || "", 
      feedback: submission.feedback || "",
      comments: ""
    });
    
    // Load file preview - get public URL for Google Docs Viewer
    if (submission.file_path) {
      try {
        const urlRes = await apiFetch<{ url: string }>(`/submissions/${submission.id}`);
        const absoluteUrl = urlRes.url.startsWith("http")
          ? urlRes.url
          : `${window.location.origin}${urlRes.url}`;
        setFilePreview(absoluteUrl);
      } catch (err) {
        console.error('Error loading file preview:', err);
        setFilePreview('');
      }
    }
    
    setGradingDialog(true);
  };

  const handleAutoGrade = async () => {
    if (!selectedSubmission) return;
    
    setIsAutoGrading(true);
    try {
      await apiFetch(`/submissions/${selectedSubmission.submission.id}/grade`, {
        method: "POST",
        body: JSON.stringify({ auto: true }),
      });
      toast.success("AI grading completed!");
    } catch (error: any) {
      console.error('Auto-grading error:', error);
      toast.error(error.message || 'Failed to auto-grade assignment');
    } finally {
      setIsAutoGrading(false);
    }
  };

  const saveGrade = async () => {
    if (!selectedSubmission) return;

    try {
      await apiFetch(`/submissions/${selectedSubmission.submission.id}/grade`, {
        method: "POST",
        body: JSON.stringify({
          marks_obtained: parseInt(gradeData.marks),
          feedback: gradeData.feedback,
          status: "graded",
        }),
      });

      toast.success("Grade saved successfully");
      setGradingDialog(false);
      
      // Refresh the data to update the tabs
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save grade");
    }
  };

  const downloadFile = async (submissionId: string) => {
    try {
      const urlRes = await apiFetch<{ url: string }>(`/submissions/${submissionId}`);
      window.open(urlRes.url, "_blank");
    } catch (error: any) {
      toast.error(error.message || "Failed to download file");
    }
  };

  const getSubmissionsForAssignment = (assignmentId: string) => {
    let filtered = submissions.filter(s => s.assignment_id === assignmentId);
    if (selectedStudent !== "all") {
      filtered = filtered.filter(s => s.user_id === selectedStudent);
    }
    return filtered;
  };

  const getUsersWithoutSubmission = (assignmentId: string) => {
    const submittedUserIds = submissions
      .filter(s => s.assignment_id === assignmentId)
      .map(s => s.user_id);
    
    return allUsers.filter(u => !submittedUserIds.includes(u.id));
  };

  if (!(isAdmin || isTeacher)) {
    return (
      <div className="p-8">
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">Loading...</div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Assignment Submissions</h1>
        <div className="flex gap-3">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {allUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "marked" | "unmarked")}>
        <TabsList>
          <TabsTrigger value="unmarked">Unmarked</TabsTrigger>
          <TabsTrigger value="marked">Marked</TabsTrigger>
        </TabsList>

        <TabsContent value="unmarked" className="space-y-4">
          {assignments.map((assignment) => {
            const unmarkedSubmissions = getSubmissionsForAssignment(assignment.id)
              .filter(s => (s.status || "").toLowerCase() !== "graded");
            
            if (unmarkedSubmissions.length === 0) return null;

            return (
              <Card key={assignment.id} className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{assignment.title}</h3>
                  <p className="text-sm text-muted-foreground">{assignment.course_code}</p>
                </div>

                <div className="space-y-3">
                  {unmarkedSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-amber-50 dark:bg-amber-950/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30">
                            Pending
                          </Badge>
                          <div>
                            <p className="font-medium">{submission.user_name}</p>
                            <p className="text-sm text-muted-foreground">{submission.user_email}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span>
                            Submitted: {submission.submitted_at ? format(new Date(submission.submitted_at), "PPp") : "N/A"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {submission.file_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(submission.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleGrade(assignment, submission)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Grade Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="marked" className="space-y-4">
          {assignments.map((assignment) => {
            const markedSubmissions = getSubmissionsForAssignment(assignment.id)
              .filter(s => (s.status || "").toLowerCase() === "graded");
            
            if (markedSubmissions.length === 0) return null;

            return (
              <Card key={assignment.id} className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold">{assignment.title}</h3>
                  <p className="text-sm text-muted-foreground">{assignment.course_code}</p>
                </div>

                <div className="space-y-3">
                  {markedSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-green-50 dark:bg-green-950/20"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30">
                            Graded
                          </Badge>
                          <div>
                            <p className="font-medium">{submission.user_name}</p>
                            <p className="text-sm text-muted-foreground">{submission.user_email}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span>
                            Submitted: {submission.submitted_at ? format(new Date(submission.submitted_at), "PPp") : "N/A"}
                          </span>
                          <span className="font-medium">
                            Marks: {submission.marks_obtained}/{assignment.points || 100}
                          </span>
                          {submission.graded_at && (
                            <span>
                              Graded: {format(new Date(submission.graded_at), "PPp")}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {submission.file_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(submission.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleGrade(assignment, submission)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View/Edit Grade
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={gradingDialog} onOpenChange={setGradingDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Grade Submission: {selectedSubmission?.assignment.title}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoGrade}
                disabled={isAutoGrading}
                className="ml-4"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isAutoGrading ? 'AI Grading...' : 'Auto Grade with AI'}
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* Left: Assignment Preview */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Assignment Preview
              </div>
              {filePreview && (
                <div className="flex justify-end px-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(filePreview, "_blank")}>
                    <Download className="h-4 w-4 mr-2" />
                    Open in new tab
                  </Button>
                </div>
              )}
              <Card className="p-0 overflow-hidden">
                {filePreview ? (
                  <iframe
                    src={filePreview}
                    className="w-full h-[500px] border-0"
                    title="Assignment Preview"
                  />
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading preview...
                  </div>
                )}
              </Card>
            </div>

            {/* Right: Grading Form */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">
                Grading Details
              </div>
              
              <div>
                <Label>Student</Label>
                <div className="text-sm mt-1">
                  <p className="font-medium">{selectedSubmission?.submission.user_name}</p>
                  <p className="text-muted-foreground">{selectedSubmission?.submission.user_email}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="marks">Marks Obtained</Label>
                <Input
                  id="marks"
                  type="number"
                  value={gradeData.marks}
                  onChange={(e) => setGradeData({ ...gradeData, marks: e.target.value })}
                  placeholder={`Out of ${selectedSubmission?.assignment.points}`}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={gradeData.feedback}
                  onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                  rows={5}
                  placeholder="Enter detailed feedback..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={gradeData.comments}
                  onChange={(e) => setGradeData({ ...gradeData, comments: e.target.value })}
                  rows={3}
                  placeholder="Additional comments..."
                  className="mt-1"
                />
              </div>

              <Button onClick={saveGrade} className="w-full" size="lg">
                Save Grade
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
