import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle, Upload, Calendar, Plus, Trash2, Copy, Edit2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface Assignment {
  id: string;
  title: string;
  course: string;
  course_code: string;
  due_date: string | null;
  priority: string | null;
  hours_left: number | null;
  points: number | null;
  description: string | null;
  status: string | null;
  submitted_date: string | null;
  grade: string | null;
  feedback: string | null;
  attempts: number;
  custom_deadline?: string | null; // Per-user deadline
}

export default function Assignments() {
  const { isEditMode } = useEditMode();
  const { user, isAdmin, isTeacher } = useAuth();
  const canManage = isAdmin || isTeacher;
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [extraAttemptsDialogOpen, setExtraAttemptsDialogOpen] = useState(false);
  const [selectedAssignmentForAttempts, setSelectedAssignmentForAttempts] = useState<string>("");
  const [selectedUserForAttempts, setSelectedUserForAttempts] = useState<string>("");
  const [extraAttemptsCount, setExtraAttemptsCount] = useState<number>(1);
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);
  const [selectedAssignmentForDeadline, setSelectedAssignmentForDeadline] = useState<string>("");
  const [selectedUserForDeadline, setSelectedUserForDeadline] = useState<string>("");
  const [customDeadline, setCustomDeadlineValue] = useState<string>("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAssignments();
      if (canManage) fetchUsers();
    }
  }, [user, canManage]);

useEffect(() => {
    if (user) fetchSubmissions();
  }, [user, canManage]);

const fetchUsers = async () => {
    if (!canManage) return;
    try {
      const data = await apiFetch<any[]>("/users");
      setUsers(data);
    } catch (error) {
      console.error(error);
      setUsers([]);
    }
  };

  const fetchSubmissions = async () => {
    if (!user) return;
    try {
      const data = await apiFetch<any[]>(`/submissions${canManage ? "" : "?mine=true"}`);
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setSubmissions([]);
    }
  };

  const getSubmissionForAssignment = (assignmentId: string, userId?: string) => {
    if (userId) {
      return submissions.find(s => s.assignment_id === assignmentId && s.user_id === userId);
    }
    return submissions.find(s => s.assignment_id === assignmentId && s.user_id === user?.id);
  };

  const deleteSubmission = async (submissionId: string) => {
    try {
      await apiFetch(`/submissions/${submissionId}`, { method: "DELETE" });
      setSubmissions(submissions.filter(s => s.id !== submissionId));
      toast.success("Submission deleted");
    } catch (error: any) {
      toast.error("Failed to delete submission");
    }
  };

  const getFilteredSubmissions = () => {
    if (!canManage) return submissions;
    if (filterUserId === "all") return submissions;
    return submissions.filter(s => s.user_id === filterUserId);
  };

  const getUserSubmissionCount = (assignmentId: string, userId: string) => {
    return submissions.filter(s => s.assignment_id === assignmentId && s.user_id === userId).length;
  };

  const grantExtraAttempts = async () => {
    if (!selectedAssignmentForAttempts || !selectedUserForAttempts) {
      toast.error("Please select both assignment and user");
      return;
    }

    try {
      await apiFetch(`/assignments/${selectedAssignmentForAttempts}/extra-attempts`, {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUserForAttempts,
          extra_attempts: extraAttemptsCount
        })
      });

      toast.success(`Granted ${extraAttemptsCount} extra attempt(s)`);
      setExtraAttemptsDialogOpen(false);
      setSelectedAssignmentForAttempts("");
      setSelectedUserForAttempts("");
      setExtraAttemptsCount(1);
    } catch (error: any) {
      toast.error("Failed to grant extra attempts");
    }
  };

  const saveCustomDeadline = async () => {
    if (!selectedAssignmentForDeadline || !selectedUserForDeadline || !customDeadline) {
      toast.error("Select assignment, user, and deadline");
      return;
    }
    try {
      await apiFetch(`/assignments/${selectedAssignmentForDeadline}/deadline`, {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUserForDeadline,
          deadline: customDeadline
        })
      });
      toast.success("Custom deadline saved");
      setDeadlineDialogOpen(false);
      setSelectedAssignmentForDeadline("");
      setSelectedUserForDeadline("");
      setCustomDeadlineValue("");
      fetchAssignments();
    } catch (error: any) {
      toast.error(error?.message || "Failed to set deadline");
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile || !selectedUser) {
      toast.error("Please select a user and upload a PDF");
      return;
    }

    toast.info("PDF parsing will be implemented with document parsing API");
    // TODO: Implement PDF parsing to extract assignment data
    setUploadDialogOpen(false);
    setPdfFile(null);
    setSelectedUser("");
  };

  const submitAssignmentFile = async (assignmentId: string, file: File) => {
    try {
      setSubmittingId(assignmentId);
      const fd = new FormData();
      fd.append("file", file);
      const target = assignments.find((a) => a.id === assignmentId);
      if (target?.course) {
        fd.append("course_id", target.course);
      }
      await apiFetch(`/assignments/${assignmentId}/submit`, { method: "POST", body: fd });
      toast.success("Assignment submitted");
      await fetchSubmissions();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit assignment");
    } finally {
      setSubmittingId(null);
    }
  };

  const fetchAssignments = async () => {
    try {
      const data = await apiFetch<Assignment[]>("/assignments");
      setAssignments(data);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateAssignment = async (id: string, field: string, value: any) => {
    try {
      await apiFetch(`/assignments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value })
      });
      setAssignments(assignments.map(a => a.id === id ? { ...a, [field]: value } : a));
    } catch (error: any) {
      toast.error("Failed to update assignment");
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      await apiFetch(`/assignments/${id}`, { method: "DELETE" });
      setAssignments(assignments.filter(a => a.id !== id));
      toast.success("Assignment deleted");
    } catch (error: any) {
      toast.error("Failed to delete assignment");
    }
  };

  const addAssignment = async (status: string) => {
    try {
      await apiFetch("/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: "New Assignment",
          course: "Course Name",
          course_code: "CODE",
          status: status,
          points: 100,
          priority: "medium",
          attempts: 2
        })
      });
      fetchAssignments();
      toast.success("Assignment added");
    } catch (error: any) {
      toast.error("Failed to add assignment");
    }
  };

  const duplicateAssignment = async (assignment: Assignment) => {
    try {
      await apiFetch("/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: `${assignment.title} (Copy)`,
          course: assignment.course,
          course_code: assignment.course_code,
          due_date: assignment.due_date,
          priority: assignment.priority,
          hours_left: assignment.hours_left,
          points: assignment.points,
          description: assignment.description,
          status: assignment.status
        })
      });
      fetchAssignments();
      toast.success("Assignment duplicated");
    } catch (error: any) {
      toast.error("Failed to duplicate assignment");
    }
  };

  const pendingAssignments = assignments.filter(a => {
    const submission = getSubmissionForAssignment(a.id);
    // Pending if not submitted
    return !submission;
  });
  
  const completedAssignments = assignments.filter(a => {
    const submission = getSubmissionForAssignment(a.id);
    // Completed if submitted (graded or awaiting grading)
    return !!submission;
  });

  if (loading) return <div className="animate-fade-in">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {isAdmin ? "All Submissions" : "Assignments"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "View and manage all student submissions" : "Track and manage your assignments"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/20">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Assignments File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
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
                    <Label>Upload File (CSV, Excel, or PDF)</Label>
                    <Input
                      type="file"
                      accept=".pdf,.csv,.xlsx,.xls"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Upload a file containing assignment details. The system will extract and create assignments for the selected user.
                    </p>
                  </div>
                  <Button onClick={handlePdfUpload} className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Parse & Add Assignments
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Filter by User:</Label>
          <Select value={filterUserId} onValueChange={setFilterUserId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isAdmin ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Submitted Assignments</h2>
            <Dialog open={extraAttemptsDialogOpen} onOpenChange={setExtraAttemptsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Grant Extra Attempts
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Grant Extra Submission Attempts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Select Assignment</Label>
                    <Select value={selectedAssignmentForAttempts} onValueChange={setSelectedAssignmentForAttempts}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select User</Label>
                    <Select value={selectedUserForAttempts} onValueChange={setSelectedUserForAttempts}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose user" />
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
                    <Label>Extra Attempts</Label>
                    <Input
                      type="number"
                      min="1"
                      value={extraAttemptsCount}
                      onChange={(e) => setExtraAttemptsCount(parseInt(e.target.value) || 1)}
                      placeholder="Number of extra attempts"
                    />
                  </div>
                  <Button onClick={grantExtraAttempts} className="w-full">
                    Grant Attempts
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={deadlineDialogOpen} onOpenChange={setDeadlineDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Set Custom Deadline
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Assignment Deadline</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Select Assignment</Label>
                    <Select value={selectedAssignmentForDeadline} onValueChange={setSelectedAssignmentForDeadline}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignments.map((assignment) => (
                          <SelectItem key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select User</Label>
                    <Select value={selectedUserForDeadline} onValueChange={setSelectedUserForDeadline}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose user" />
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
                    <Label>Deadline (local time)</Label>
                    <Input
                      type="datetime-local"
                      value={customDeadline}
                      onChange={(e) => setCustomDeadlineValue(e.target.value)}
                    />
                  </div>
                  <Button onClick={saveCustomDeadline} className="w-full">
                    Save Deadline
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {assignments.map((assignment) => {
            const assignmentSubmissions = getFilteredSubmissions().filter(
              s => s.assignment_id === assignment.id
            );
            
            // Show assignment if it has submissions
            if (assignmentSubmissions.length === 0) return null;
            
            return (
              <Card key={assignment.id} className="p-6">
                <div className="space-y-2 mb-4">
                  <h3 className="text-lg font-semibold">{assignment.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {assignment.course} ({assignment.course_code})
                  </p>
                  {assignment.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Total Submissions: {assignmentSubmissions.length}
                  </p>
                </div>
                <div className="space-y-3">
                  {assignmentSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {submission.profiles?.full_name || submission.profiles?.email || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Attempts used: {getUserSubmissionCount(assignment.id, submission.user_id)} / {assignment.attempts}
                        </p>
                        {submission.marks_obtained !== null && (
                          <Badge className="mt-2 bg-success/20 text-success">
                            {submission.marks_obtained} / {assignment.points}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSubmission(submission.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          {getFilteredSubmissions().length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {filterUserId === "all" 
                  ? "No submissions yet" 
                  : "No submissions from this user"}
              </p>
            </Card>
          )}
        </div>
      ) : (
        <Tabs defaultValue="pending">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedAssignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {isEditMode && (
            <Button onClick={() => addAssignment("pending")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Assignment
            </Button>
          )}
          {pendingAssignments.map((a) => (
            <Card key={a.id} className="p-6 border-l-4 border-l-accent hover:shadow-glow transition-all relative group">
              {isEditMode && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    onClick={() => duplicateAssignment(a)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => deleteAssignment(a.id)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-3 flex-1">
                {isEditMode ? (
                  <>
                    <Input
                      value={a.title}
                      onChange={(e) => updateAssignment(a.id, "title", e.target.value)}
                      placeholder="Assignment Title"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={a.course}
                        onChange={(e) => updateAssignment(a.id, "course", e.target.value)}
                        placeholder="Course"
                      />
                      <Input
                        value={a.course_code}
                        onChange={(e) => updateAssignment(a.id, "course_code", e.target.value)}
                        placeholder="Code"
                      />
                    </div>
                    <Textarea
                      value={a.description || ""}
                      onChange={(e) => updateAssignment(a.id, "description", e.target.value)}
                      placeholder="Description"
                      rows={2}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="date"
                        value={a.due_date || ""}
                        onChange={(e) => updateAssignment(a.id, "due_date", e.target.value)}
                      />
                      <Input
                        type="number"
                        value={a.hours_left || 0}
                        onChange={(e) => updateAssignment(a.id, "hours_left", parseInt(e.target.value))}
                        placeholder="Hours"
                      />
                      <Input
                        type="number"
                        value={a.points || 0}
                        onChange={(e) => updateAssignment(a.id, "points", parseInt(e.target.value))}
                        placeholder="Points"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Attempts Allowed</Label>
                        <Input
                          type="number"
                          min="1"
                          value={a.attempts || 2}
                          onChange={(e) => updateAssignment(a.id, "attempts", parseInt(e.target.value))}
                          placeholder="Attempts"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold">{a.title}</h3>
                    <p className="text-sm text-muted-foreground">{a.course} ({a.course_code})</p>
                    <p className="text-sm">{a.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {(a.custom_deadline || a.due_date) && (
                        <Badge variant="outline" className="bg-primary/10">
                          <Calendar className="h-3 w-3 mr-1" />
                          Due: {new Date(a.custom_deadline || a.due_date).toLocaleDateString()}
                        </Badge>
                      )}
                      <Badge variant={a.priority === "high" ? "destructive" : "secondary"}>
                        {a.priority}
                      </Badge>
                      <Badge variant="outline">{a.points} pts</Badge>
                      {a.hours_left && (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {a.hours_left}h left
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {a.attempts} attempt(s) allowed
                      </Badge>
                    </div>
                    {(() => {
                      const submission = getSubmissionForAssignment(a.id);
                      if (submission) {
                        return (
                          <div className="mt-2 p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">Submitted</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Awaiting grading
                            </p>
                          </div>
                        );
                      }
                      return (
                        <>
                          <input
                            id={`submit-${a.id}`}
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                submitAssignmentFile(a.id, file);
                                e.target.value = "";
                              }
                            }}
                          />
                          <Button
                            className="w-full bg-gradient-primary mt-2"
                            onClick={() => document.getElementById(`submit-${a.id}`)?.click()}
                            disabled={!!submittingId}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            {submittingId === a.id ? "Submitting..." : "Submit"}
                          </Button>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {isEditMode && (
            <Button onClick={() => addAssignment("completed")} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Completed
            </Button>
          )}
          {completedAssignments.map((a) => (
            <Card key={a.id} className="p-6 border-l-4 border-l-success hover:shadow-glow transition-all relative group">
              {isEditMode && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    onClick={() => duplicateAssignment(a)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => deleteAssignment(a.id)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="space-y-3">
                {isEditMode ? (
                  <>
                    <Input
                      value={a.title}
                      onChange={(e) => updateAssignment(a.id, "title", e.target.value)}
                      placeholder="Title"
                    />
                    <Input
                      value={a.grade || ""}
                      onChange={(e) => updateAssignment(a.id, "grade", e.target.value)}
                      placeholder="Grade"
                    />
                    <Textarea
                      value={a.feedback || ""}
                      onChange={(e) => updateAssignment(a.id, "feedback", e.target.value)}
                      placeholder="Feedback"
                      rows={2}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold">{a.title}</h3>
                        <p className="text-sm text-muted-foreground">{a.course} ({a.course_code})</p>
                      </div>
                      {(() => {
                        const submission = getSubmissionForAssignment(a.id);
                        if (submission?.marks_obtained !== null) {
                          return (
                            <Badge className="bg-success/20 text-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {submission.marks_obtained} / {a.points}
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {(() => {
                      const submission = getSubmissionForAssignment(a.id);
                      if (submission?.feedback) {
                        return (
                          <div className="bg-muted/30 p-3 rounded">
                            <p className="text-sm font-medium mb-1">Feedback:</p>
                            <p className="text-sm">{submission.feedback}</p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
