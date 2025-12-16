import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  UserPlus,
  Trash2,
  Plus,
  FileText,
  Video,
  File,
  Upload,
  Download,
  BookOpen,
  FileQuestion,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileViewer } from "@/components/FileViewer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DraggableMaterialList, DraggableAssignmentList, DraggableQuizList } from "@/components/DraggableMaterialList";
import { CertificateGeneratedDialog } from "@/components/CertificateGeneratedDialog";
import quizIcon from "@/assets/quiz-icon.png";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { apiFetch } from "@/lib/api";

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user, isAdmin: isAdminFromAuth, isTeacher } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [textLessonDialogOpen, setTextLessonDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState("");
  const [currentSectionId, setCurrentSectionId] = useState("");
  const [newSection, setNewSection] = useState({ title: "", description: "" });
  const [newTextLesson, setNewTextLesson] = useState({ title: "", content: "" });
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    unit_name: "",
    description: "",
    points: 100,
    passing_marks: 50,
    assessment_brief: "",
    due_date: ""
  });
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [completedMaterials, setCompletedMaterials] = useState<Set<string>>(new Set());
  const [courseProgress, setCourseProgress] = useState(0);
  const [sectionQuizzes, setSectionQuizzes] = useState<any[]>([]);
  const [newQuiz, setNewQuiz] = useState({
    title: "",
    quiz_url: "",
    description: "",
    duration: 30,
    due_date: ""
  });
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityType, setActivityType] = useState<"text" | "file" | "assignment" | "quiz" | "brief" | "google_drive" | "video_lecture" | "ppt" | null>(null);
  const [fileDisplayName, setFileDisplayName] = useState("");
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [googleDriveTitle, setGoogleDriveTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [pptFile, setPptFile] = useState<File | null>(null);
  const [pptTitle, setPptTitle] = useState("");
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [deadlineDialogOpen, setDeadlineDialogOpen] = useState(false);
  const [selectedAssignmentForDeadline, setSelectedAssignmentForDeadline] = useState<any>(null);
  const [selectedQuizForDeadline, setSelectedQuizForDeadline] = useState<any>(null);
  const [selectedUserForDeadline, setSelectedUserForDeadline] = useState("");
  const [customDeadline, setCustomDeadline] = useState("");
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAdmin(!!(isAdminFromAuth || isTeacher));
      loadCourseData();
      if (!(isAdminFromAuth || isTeacher)) {
        setShowWelcome(true);
      }
    }
  }, [user, courseId, isAdmin, isAdminFromAuth, isTeacher]);

  useEffect(() => {
    if (user && !isAdmin) {
      loadUserProgress();
      loadUserSubmissions();
    }
  }, [user, courseId, isAdmin]);

  const loadUserSubmissions = async () => {
    if (!user || !courseId) return;
    
    try {
      const subs = await apiFetch<any[]>("/submissions?mine=true");
      setUserSubmissions(subs || []);

      const submittedAssignmentIds = new Set((subs || []).map((s: any) => s.assignment_id));
      setAssignments(prev => prev.map(a => ({
        ...a,
        hasSubmission: submittedAssignmentIds.has(a.id),
        status: submittedAssignmentIds.has(a.id) ? 'submitted' : a.status
      })));
    } catch (error) {
      console.error("Failed to load submissions", error);
    }
  };

  const loadUserProgress = async () => {
    if (!user || !courseId) return;
    
    // Load from localStorage first
    const localKey = `completed_materials_${user.id}_${courseId}`;
    const localCompleted = localStorage.getItem(localKey);
    
    if (localCompleted) {
      try {
        const completedIds = JSON.parse(localCompleted);
        setCompletedMaterials(new Set(completedIds));
      } catch (e) {
        console.error('Error parsing local storage:', e);
      }
    }
    
    try {
      const data = await apiFetch<any[]>("/progress");

      // Separate completed items by type
      const completedAssignments = data.filter(item => item.item_type === 'assignment');
      const completedQuizzes = data.filter(item => item.item_type === 'quiz');
      
      // Create set of completed IDs
      const completedItemIds = new Set<string>();
      
      // Add assignment IDs
      completedAssignments.forEach(item => {
        if (item.assignment_id) completedItemIds.add(item.assignment_id);
      });
      
      // Add quiz IDs
      completedQuizzes.forEach(item => {
        if (item.quiz_id) completedItemIds.add(item.quiz_id);
      });
      
      // Merge with localStorage completed materials
      if (localCompleted) {
        try {
          const localIds = JSON.parse(localCompleted);
          localIds.forEach((id: string) => completedItemIds.add(id));
        } catch (e) {
          console.error('Error parsing local storage:', e);
        }
      }
      
      setCompletedMaterials(completedItemIds);
    } catch (error) {
      console.error("Failed to load progress", error);
    }
  };

  const checkAndGenerateCertificate = async () => {
    if (!user || !courseId) return;

    try {
      // Only admins can create certificates via API; skip silently for students
      if (!(isAdminFromAuth || isTeacher)) return;
      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await apiFetch("/certificates", {
        method: "POST",
        body: {
          user_id: user.id,
          course_id: courseId,
          certificate_number: certificateNumber,
          completion_date: new Date().toISOString(),
        },
      });
      setCertificateDialogOpen(true);
    } catch (error: any) {
      console.error('Error generating certificate:', error);
    }
  };

  const handleMarkComplete = async (materialId: string) => {
    if (!user || !courseId) return;
    
    try {
      // Check if already completed
      if (completedMaterials.has(materialId)) {
        toast.info("Already marked as complete");
        return;
      }

      // Find the material to get its details
      const material = materials.find(m => m.id === materialId);
      if (!material) return;

      // Insert progress tracking record with material reference
      await apiFetch("/progress", {
        method: "POST",
        body: {
          user_id: user.id,
          course_id: courseId,
          item_type: "material",
          status: "completed",
          completed_at: new Date().toISOString(),
        },
      });

      // Update local state
      const newCompleted = new Set([...completedMaterials, materialId]);
      setCompletedMaterials(newCompleted);
      
      // Save to localStorage
      const localKey = `completed_materials_${user.id}_${courseId}`;
      localStorage.setItem(localKey, JSON.stringify(Array.from(newCompleted)));
      
      toast.success("Marked as complete");
    } catch (error: any) {
      console.error("Error marking complete:", error);
      toast.error(error.message || "Failed to mark as complete");
    }
  };

  const loadCourseData = async () => {
    if (!courseId) return;
    try {
      const data = await apiFetch<any>(`/courses/${courseId}`);
      setCourse(data);
      const sectionsData = data.sections || [];
      setSections(sectionsData);
      const openState: Record<string, boolean> = {};
      sectionsData.forEach((s: any) => { openState[s.id] = true; });
      setOpenSections(openState);

      const materialsData = data.materials || [];
      const filteredMaterials = isAdmin ? materialsData : materialsData.filter((m: any) => !m.is_hidden);
      setMaterials(filteredMaterials);
      if (!isAdmin && filteredMaterials.length > 0) {
        setSelectedFile(filteredMaterials[0]);
      }

      const assignmentsData = data.assignments || [];
      setAssignments(isAdmin ? assignmentsData : assignmentsData.filter((a: any) => !a.is_hidden));

      const quizzesData = data.quizzes || [];
      setSectionQuizzes(isAdmin ? quizzesData : quizzesData.filter((q: any) => !q.is_hidden));

      const enrollmentsData = data.enrollments || [];
      setEnrolledStudents(enrollmentsData);

      if (isAdmin) {
        try {
          const usersData = await apiFetch<any[]>("/users");
          setUsers(usersData);
        } catch (e) {
          console.error("Failed to load users", e);
        }
      }
    } catch (error: any) {
      console.error("Failed to load course", error);
      toast.error(error.message || "Failed to load course");
      setCourse({ title: "Course not found", code: "", category: "" });
    }
  };

  const handleEnrollUser = async () => {
    if (!selectedUserId || !courseId) return;
    
    try {
      await apiFetch("/enrollments", {
        method: "POST",
        body: {
          user_id: selectedUserId,
          course_id: courseId,
          role: "student",
        },
      });
      toast.success("User enrolled successfully");
      setEnrollDialogOpen(false);
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to enroll user");
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId || !confirm("Are you sure you want to delete this course?")) return;
    
    try {
      await apiFetch(`/courses/${courseId}`, { method: "DELETE" });
      toast.success("Course deleted");
      window.location.href = "/courses";
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddSection = async () => {
    if (!newSection.title || !courseId) return;
    
    try {
      await apiFetch("/sections", {
        method: "POST",
        body: {
          course_id: courseId,
          title: newSection.title,
          description: newSection.description,
          order_index: sections.length,
        },
      });
      toast.success("Section added");
      setSectionDialogOpen(false);
      setNewSection({ title: "", description: "" });
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddTextLesson = async () => {
    if (!newTextLesson.title || !newTextLesson.content || !currentSectionId || !courseId) return;
    
    try {
      // Create an in-memory HTML file from the lesson content
      const file = new File([newTextLesson.content], `${newTextLesson.title || "lesson"}.html`, { type: "text/html" });
      const fd = new FormData();
      fd.append("course_id", courseId);
      fd.append("section_id", currentSectionId);
      fd.append("title", newTextLesson.title);
      fd.append("file", file);
      fd.append("order_index", sections.length.toString());

      await apiFetch("/materials", { method: "POST", body: fd });

      toast.success("Text lesson added");
      setTextLessonDialogOpen(false);
      setNewTextLesson({ title: "", content: "" });
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add text lesson");
    }
  };

  const handleUploadMaterials = async (sectionId: string) => {
    if (uploadFiles.length === 0 || !fileDisplayName) {
      toast.error("Please provide a display name for the file");
      return;
    }
    
    try {
      for (const file of uploadFiles) {
        const fd = new FormData();
        fd.append("course_id", courseId || "");
        fd.append("section_id", sectionId);
        fd.append("title", fileDisplayName);
        fd.append("file", file);
        fd.append("order_index", sections.length.toString());
        await apiFetch("/materials", { method: "POST", body: fd });
      }

      toast.success("Materials uploaded");
      setUploadFiles([]);
      setFileDisplayName("");
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.title || !courseId || !currentSectionId) return;
    
    try {
      // Convert datetime-local to UAE timezone (UTC+4) ISO string
      let dueDate = null;
      if (newAssignment.due_date) {
        // datetime-local gives us local time, treat it as UAE time
        const localDate = new Date(newAssignment.due_date);
        // Adjust to UAE timezone (UTC+4)
        const uaeOffset = 4 * 60; // 4 hours in minutes
        const localOffset = localDate.getTimezoneOffset(); // local offset in minutes (negative for UAE)
        const totalOffset = uaeOffset + localOffset;
        localDate.setMinutes(localDate.getMinutes() - totalOffset);
        dueDate = localDate.toISOString();
      }

      const created = await apiFetch<{ id: string }>("/assignments", {
        method: "POST",
        body: {
          course: courseId,
          course_code: course.code,
          title: newAssignment.title,
          description: newAssignment.description,
          points: newAssignment.points,
          due_date: dueDate
        }
      });

      // Patch additional fields that aren't part of the create endpoint
      if (created?.id) {
        await apiFetch(`/assignments/${created.id}`, {
          method: "PATCH",
          body: {
            unit_name: currentSectionId,
            passing_marks: newAssignment.passing_marks,
            assessment_brief: newAssignment.assessment_brief,
          },
        });

        // If an assessment brief file was provided, upload it as a material in the same section
        if (assignmentFile) {
          const fd = new FormData();
          fd.append("course_id", courseId);
          fd.append("section_id", currentSectionId);
          fd.append("title", `${newAssignment.title} - Brief`);
          fd.append("file", assignmentFile);
          fd.append("order_index", sections.length.toString());
          await apiFetch("/materials", { method: "POST", body: fd });
        }
      }

      toast.success("Assignment added");
      setAssignmentDialogOpen(false);
      setNewAssignment({ 
        title: "", 
        unit_name: "", 
        description: "", 
        points: 100, 
        passing_marks: 50,
        assessment_brief: "",
        due_date: "" 
      });
      setAssignmentFile(null);
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!submissionFile || !selectedAssignment || !user) return;
    
    try {
      const fd = new FormData();
      fd.append("file", submissionFile);
      if (courseId) fd.append("course_id", courseId);
      await apiFetch(`/assignments/${selectedAssignment.id}/submit`, { method: "POST", body: fd });

      toast.success("Assignment submitted");
      setSubmissionDialogOpen(false);
      setSubmissionFile(null);
      setSelectedAssignment(null);
      loadUserSubmissions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddQuiz = async () => {
    if (!newQuiz.title || !newQuiz.quiz_url || !currentSectionId || !courseId) return;
    
    try {
      // Convert datetime-local to UAE timezone (UTC+4) ISO string
      let dueDate = null;
      if (newQuiz.due_date) {
        // datetime-local gives us local time, treat it as UAE time
        const localDate = new Date(newQuiz.due_date);
        // Adjust to UAE timezone (UTC+4)
        const uaeOffset = 4 * 60; // 4 hours in minutes
        const localOffset = localDate.getTimezoneOffset(); // local offset in minutes (negative for UAE)
        const totalOffset = uaeOffset + localOffset;
        localDate.setMinutes(localDate.getMinutes() - totalOffset);
        dueDate = localDate.toISOString();
      }

      await apiFetch("/quizzes", {
        method: "POST",
        body: {
          course_id: courseId,
          section_id: currentSectionId,
          title: newQuiz.title,
          quiz_url: newQuiz.quiz_url,
          description: newQuiz.description,
          duration: newQuiz.duration,
          due_date: dueDate,
        },
      });
      toast.success("Quiz added successfully");
      setNewQuiz({ title: "", quiz_url: "", description: "", duration: 30, due_date: "" });
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add quiz");
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Delete this quiz?")) return;
    
    try {
      await apiFetch(`/quizzes/${quizId}`, { method: "DELETE" });
      toast.success("Quiz deleted");
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };


  const getFileIcon = (fileType: string) => {
    if (fileType?.includes("video")) return <Video className="h-4 w-4" />;
    if (fileType?.includes("pdf")) return <FileText className="h-4 w-4" />;
    if (fileType?.includes("text/html")) return <BookOpen className="h-4 w-4" />;
    if (fileType === "google_drive") return <File className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleReorderMaterials = async (sectionId: string, reorderedMaterials: any[]) => {
    try {
      await apiFetch("/materials/reorder", {
        method: "POST",
        body: { order: reorderedMaterials.map((m) => m.id) },
      });
      loadCourseData();
      toast.success('Materials reordered');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder materials');
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const material = materials.find(m => m.id === materialId);
      if (!material) return;
      await apiFetch(`/materials/${materialId}`, { method: "DELETE" });
      toast.success('Material deleted');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete material');
    }
  };

  const handleUpdateMaterial = async (materialId: string, updates: any) => {
    try {
      await apiFetch(`/materials/${materialId}`, { method: "PATCH", body: updates });
      toast.success('Material updated');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update material');
    }
  };

  const handleUpdateAssignment = async (assignmentId: string, updates: any) => {
    try {
      await apiFetch(`/assignments/${assignmentId}`, { method: "PATCH", body: updates });
      toast.success('Assignment updated');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update assignment');
    }
  };

  const handleUpdateQuiz = async (quizId: string, updates: any) => {
    try {
      await apiFetch(`/quizzes/${quizId}`, { method: "PATCH", body: updates });
      toast.success('Quiz updated');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update quiz');
    }
  };

  const handleSetUserDeadline = async () => {
    if (!selectedUserForDeadline || !customDeadline) {
      if (selectedAssignmentForDeadline && !selectedUserForDeadline) {
        toast.error("Please select a user");
        return;
      }
      if (!customDeadline) {
        toast.error("Please set a deadline");
        return;
      }
    }
    
    try {
      if (selectedAssignmentForDeadline) {
        // Set deadline for assignment
        await apiFetch(`/assignments/${selectedAssignmentForDeadline.id}/deadline`, {
          method: "POST",
          body: { user_id: selectedUserForDeadline || getDefaultDeadlineUser(), deadline: customDeadline },
        });
        toast.success("Custom assignment deadline set successfully");
      } else if (selectedQuizForDeadline) {
        // Update quiz deadline
        await apiFetch(`/quizzes/${selectedQuizForDeadline.id}/deadline`, {
          method: "POST",
          body: { user_id: selectedUserForDeadline || user?.id, deadline: customDeadline },
        });
        toast.success("Quiz deadline set successfully");
      }
      
      setDeadlineDialogOpen(false);
      setSelectedAssignmentForDeadline(null);
      setSelectedQuizForDeadline(null);
      setSelectedUserForDeadline("");
      setCustomDeadline("");
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to set deadline");
    }
  };

  const formatDateForInput = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    const tzAdjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return tzAdjusted.toISOString().slice(0, 16);
  };

  const mergeUsers = (enrolled: any[], all: any[]) => [
    ...enrolled,
    ...all.filter((u) => !enrolled.find((e) => e.id === u.id)),
  ];

  const mergedUserOptions = mergeUsers(enrolledStudents, users);

  const getDefaultDeadlineUser = (options?: any[]) => {
    const list = options ?? mergedUserOptions;
    if (list?.length) return list[0].id;
    if (user?.id) return user.id;
    return "";
  };

  const ensureUsersLoaded = async (): Promise<any[]> => {
    let merged = mergeUsers(enrolledStudents, users);
    if (merged.length > 0 || !(isAdminFromAuth || isTeacher)) return merged;
    try {
      const data = await apiFetch<any[]>("/users");
      setUsers(data || []);
      merged = mergeUsers(enrolledStudents, data || []);
    } catch (e) {
      console.error("Failed to load users for deadline dialog", e);
    }
    return merged;
  };

  const openAssignmentDeadlineDialog = async (assignment: any) => {
    const options = await ensureUsersLoaded();
    const defaultUser = getDefaultDeadlineUser(options);
    setSelectedAssignmentForDeadline(assignment);
    setSelectedQuizForDeadline(null);
    setSelectedUserForDeadline(defaultUser);
    setCustomDeadline(formatDateForInput(assignment?.custom_deadline || assignment?.due_date));
    setDeadlineDialogOpen(true);
  };

  const openQuizDeadlineDialog = async (quiz: any) => {
    const options = await ensureUsersLoaded();
    const defaultUser = getDefaultDeadlineUser(options);
    setSelectedQuizForDeadline(quiz);
    setSelectedAssignmentForDeadline(null);
    setSelectedUserForDeadline(defaultUser);
    setCustomDeadline(formatDateForInput(quiz?.custom_deadline || quiz?.due_date));
    setDeadlineDialogOpen(true);
  };

  const handleToggleHideMaterial = async (materialId: string, currentlyHidden: boolean) => {
    try {
      await apiFetch(`/materials/${materialId}`, {
        method: "PATCH",
        body: { is_hidden: !currentlyHidden },
      });
      toast.success(currentlyHidden ? 'Material visible to students' : 'Material hidden from students');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update visibility');
    }
  };

  const handleToggleHideAssignment = async (assignmentId: string, currentlyHidden: boolean) => {
    try {
      await apiFetch(`/assignments/${assignmentId}`, {
        method: "PATCH",
        body: { is_hidden: !currentlyHidden },
      });
      toast.success(currentlyHidden ? 'Assignment visible to students' : 'Assignment hidden from students');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update visibility');
    }
  };

  const handleToggleHideQuiz = async (quizId: string, currentlyHidden: boolean) => {
    try {
      await apiFetch(`/quizzes/${quizId}`, {
        method: "PATCH",
        body: { is_hidden: !currentlyHidden },
      });
      toast.success(currentlyHidden ? 'Quiz visible to students' : 'Quiz hidden from students');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update visibility');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Delete this assignment?")) return;
    
    try {
      await apiFetch(`/assignments/${assignmentId}`, { method: "DELETE" });
      toast.success('Assignment deleted');
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete assignment');
    }
  };

  const handleAddPowerPoint = async () => {
    if (!pptFile || !pptTitle || !currentSectionId) {
      toast.error("Please provide title and PowerPoint file");
      return;
    }
    
    try {
      const fd = new FormData();
      fd.append("course_id", courseId || "");
      fd.append("section_id", currentSectionId);
      fd.append("title", pptTitle);
      fd.append("file", pptFile);
      fd.append("order_index", sections.length.toString());

      await apiFetch("/materials", { method: "POST", body: fd });
      
      toast.success("PowerPoint added");
      setPptTitle("");
      setPptFile(null);
      setActivityDialogOpen(false);
      setActivityType(null);
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add PowerPoint");
    }
  };

  const handleAddVideoLecture = async () => {
    if (!videoFile || !videoTitle || !currentSectionId) {
      toast.error("Please provide title and video file");
      return;
    }
    
    try {
      const fd = new FormData();
      fd.append("course_id", courseId || "");
      fd.append("section_id", currentSectionId);
      fd.append("title", videoTitle);
        fd.append("file", videoFile);
        fd.append("order_index", sections.length.toString());

        await apiFetch("/materials", { method: "POST", body: fd });
      
      toast.success("Video lecture added");
      setVideoTitle("");
      setVideoFile(null);
      setActivityDialogOpen(false);
      setActivityType(null);
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add video lecture");
    }
  };

  const handleAddAssessmentBrief = async () => {
    if (!newAssignment.title || !currentSectionId) return;
    
    try {
      if (!courseId) return;

      if (assignmentFile) {
        const fd = new FormData();
        fd.append("course_id", courseId);
        fd.append("section_id", currentSectionId);
        fd.append("title", `${newAssignment.title} - Brief`);
        fd.append("file", assignmentFile);
        fd.append("order_index", sections.length.toString());
        await apiFetch("/materials", { method: "POST", body: fd });
      } else if (newAssignment.assessment_brief) {
        const briefFile = new File(
          [newAssignment.assessment_brief],
          `${newAssignment.title || "brief"}.txt`,
          { type: "text/plain" }
        );
        const fd = new FormData();
        fd.append("course_id", courseId);
        fd.append("section_id", currentSectionId);
        fd.append("title", `${newAssignment.title} - Brief`);
        fd.append("file", briefFile);
        fd.append("order_index", sections.length.toString());
        await apiFetch("/materials", { method: "POST", body: fd });
      }
      
      toast.success("Assessment brief added");
      setNewAssignment({
        title: "",
        unit_name: "",
        description: "",
        points: 100,
        passing_marks: 50,
        assessment_brief: "",
        due_date: ""
      });
      setAssignmentFile(null);
      setActivityDialogOpen(false);
      setActivityType(null);
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add assessment brief");
    }
  };

  const handleAddGoogleDrive = async () => {
    if (!googleDriveUrl || !googleDriveTitle || !currentSectionId) {
      toast.error("Please provide both title and URL");
      return;
    }
    
    try {
      // Convert Google Drive link to embed format if needed
      let embedUrl = googleDriveUrl;
      
      // Handle different Google Drive URL formats
      if (googleDriveUrl.includes('/file/d/')) {
        const fileId = googleDriveUrl.match(/\/file\/d\/([^/]+)/)?.[1];
        if (fileId) {
          embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      } else if (googleDriveUrl.includes('/open?id=')) {
        const fileId = googleDriveUrl.match(/[?&]id=([^&]+)/)?.[1];
        if (fileId) {
          embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }

      const fd = new FormData();
      fd.append("course_id", courseId || "");
      fd.append("section_id", currentSectionId);
      fd.append("title", googleDriveTitle);
      fd.append("link_url", embedUrl);
      fd.append("file_type", "google_drive");
      fd.append("order_index", sections.length.toString());
      await apiFetch("/materials", { method: "POST", body: fd });
      
      toast.success("Google Drive content added");
      setGoogleDriveUrl("");
      setGoogleDriveTitle("");
      setActivityDialogOpen(false);
      setActivityType(null);
      loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add Google Drive content");
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("Delete this submission?")) return;
    
    try {
      await apiFetch(`/submissions/${submissionId}`, { method: "DELETE" });
      toast.success('Submission deleted');
      loadUserSubmissions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete submission');
    }
  };

  const downloadMaterial = async (filePath: string, title: string) => {
    try {
      const url = `/backend/storage/course-materials/${filePath}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = title;
      a.click();
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  if (!course) return <div className="flex justify-center items-center min-h-96">Loading...</div>;

  // Calculate progress based on completed materials
  const viewableMaterials = materials.filter(m => 
    m.file_type !== "application/brief" && 
    m.file_type !== "assignment" &&
    !m.file_type?.includes('quiz')
  );
  const totalItems = viewableMaterials.length;
  const completedItems = Array.from(completedMaterials).filter(id => 
    viewableMaterials.some(m => m.id === id)
  ).length;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const deadlineUserOptions = enrolledStudents.length > 0 ? enrolledStudents : users;

  // Admin view - old layout with tabs
  if (isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <p className="text-muted-foreground">{course.code}</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Enroll User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enroll User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => !enrolledStudents.find(s => s.id === u.id)).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleEnrollUser}>Enroll</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" onClick={handleDeleteCourse} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Course
              </Button>
            </div>
          </div>

          <Tabs defaultValue="content" className="space-y-4">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Course Sections</CardTitle>
                  <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Section
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Section</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Title</Label>
                          <Input
                            value={newSection.title}
                            onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={newSection.description}
                            onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddSection}>Add Section</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sections.map((section) => (
                    <Card key={section.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => {
                              setCurrentSectionId(section.id);
                              setActivityDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add an activity
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <DraggableMaterialList
                          materials={materials.filter(m => m.section_id === section.id)}
                          onReorder={async (reordered) => {
                            setMaterials(materials.map(m =>
                              m.section_id === section.id
                                ? reordered.find(r => r.id === m.id) || m
                                : m
                            ));
                            try {
                              await apiFetch("/materials/reorder", {
                                method: "POST",
                                body: { order: reordered.map(r => r.id) },
                              });
                            } catch (error) {
                              console.error("Reorder failed", error);
                            }
                          }}
                          onDelete={async (id) => {
                            try {
                              await apiFetch(`/materials/${id}`, { method: "DELETE" });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to delete material");
                            }
                          }}
                          onUpdate={async (id, updates) => {
                            try {
                              await apiFetch(`/materials/${id}`, {
                                method: "PATCH",
                                body: updates,
                              });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to update material");
                            }
                          }}
                          getFileIcon={(fileType: string) => {
                            if (fileType?.includes("video")) return <Video className="h-4 w-4" />;
                            if (fileType?.includes("pdf")) return <FileText className="h-4 w-4" />;
                            if (fileType?.includes("text/html")) return <BookOpen className="h-4 w-4" />;
                            if (fileType === "google_drive") return <File className="h-4 w-4" />;
                            return <File className="h-4 w-4" />;
                          }}
                        />
                        
                        <DraggableAssignmentList
                          assignments={assignments.filter(a => a.unit_name === section.id)}
                          onDelete={async (id) => {
                            try {
                              await apiFetch(`/assignments/${id}`, { method: "DELETE" });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to delete assignment");
                            }
                          }}
                          onUpdate={async (id, updates) => {
                            try {
                              await apiFetch(`/assignments/${id}`, { method: "PATCH", body: updates });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to update assignment");
                            }
                          }}
                          onToggleHide={async (id, isHidden) => {
                            try {
                              await apiFetch(`/assignments/${id}`, { method: "PATCH", body: { is_hidden: isHidden } });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to update visibility");
                            }
                          }}
                          onSetDeadline={openAssignmentDeadlineDialog}
                        />
                        
                        <DraggableQuizList
                          quizzes={sectionQuizzes.filter(q => q.section_id === section.id)}
                          onDelete={async (id) => {
                            try {
                              await apiFetch(`/quizzes/${id}`, { method: "DELETE" });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to delete quiz");
                            }
                          }}
                          onUpdate={async (id, updates) => {
                            try {
                              await apiFetch(`/quizzes/${id}`, { method: "PATCH", body: updates });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to update quiz");
                            }
                          }}
                          onToggleHide={async (id, isHidden) => {
                            try {
                              await apiFetch(`/quizzes/${id}`, { method: "PATCH", body: { is_hidden: isHidden } });
                              loadCourseData();
                            } catch (error: any) {
                              toast.error(error.message || "Failed to update quiz visibility");
                            }
                          }}
                          onSetDeadline={openQuizDeadlineDialog}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Enrolled Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrolledStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.full_name || "N/A"}</TableCell>
                          <TableCell>{student.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog
          open={deadlineDialogOpen}
          onOpenChange={async (open) => {
            if (open) {
              const options = await ensureUsersLoaded();
              if (!selectedUserForDeadline && options.length) {
                setSelectedUserForDeadline(getDefaultDeadlineUser(options));
              }
            }
            setDeadlineDialogOpen(open);
            if (!open) {
              setSelectedAssignmentForDeadline(null);
              setSelectedQuizForDeadline(null);
              setSelectedUserForDeadline("");
              setCustomDeadline("");
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Set Custom Deadline</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {selectedAssignmentForDeadline
                  ? `Assignment: ${selectedAssignmentForDeadline.title}`
                  : selectedQuizForDeadline
                    ? `Quiz: ${selectedQuizForDeadline.title}`
                    : "Select an assignment or quiz to set a deadline."}
              </div>
              <div>
                <Label>User</Label>
                {mergedUserOptions.length ? (
                  <Select
                    value={selectedUserForDeadline}
                    onValueChange={setSelectedUserForDeadline}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose learner" />
                    </SelectTrigger>
                    <SelectContent>
                      {mergedUserOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">No users available. Enroll a learner first.</p>
                )}
              </div>
              <div>
                <Label>Deadline (local time)</Label>
                <Input
                  type="datetime-local"
                  value={customDeadline}
                  onChange={(e) => setCustomDeadline(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSetUserDeadline}
                className="w-full"
                disabled={!mergedUserOptions.length && !user?.id}
              >
                Save Deadline
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Activity Dialog */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Activity</DialogTitle>
            </DialogHeader>
            {!activityType ? (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("text")}
                >
                  <FileText className="h-8 w-8" />
                  Text Lesson
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("file")}
                >
                  <File className="h-8 w-8" />
                  File
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("ppt")}
                >
                  <FileText className="h-8 w-8" />
                  PowerPoint
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("assignment")}
                >
                  <Upload className="h-8 w-8" />
                  Assignment
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("brief")}
                >
                  <FileQuestion className="h-8 w-8" />
                  Assessment Brief
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("quiz")}
                >
                  <BookOpen className="h-8 w-8" />
                  Quiz
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("google_drive")}
                >
                  <File className="h-8 w-8" />
                  Google Drive
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2"
                  onClick={() => setActivityType("video_lecture")}
                >
                  <Video className="h-8 w-8" />
                  Video Lecture
                </Button>
              </div>
            ) : activityType === "text" ? (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newTextLesson.title}
                    onChange={(e) => setNewTextLesson({ ...newTextLesson, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <RichTextEditor
                    content={newTextLesson.content}
                    onChange={(content) => setNewTextLesson({ ...newTextLesson, content })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddTextLesson}>Add</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setNewTextLesson({ title: "", content: "" });
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : activityType === "file" ? (
              <div className="space-y-4">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={fileDisplayName}
                    onChange={(e) => setFileDisplayName(e.target.value)}
                    placeholder="Enter display name for the file"
                  />
                </div>
                <div>
                  <Label>Upload Files</Label>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(Array.from(e.target.files || []))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleUploadMaterials(currentSectionId)}>Upload</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setFileDisplayName("");
                    setUploadFiles([]);
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : activityType === "ppt" ? (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={pptTitle}
                    onChange={(e) => setPptTitle(e.target.value)}
                    placeholder="Enter PowerPoint title"
                  />
                </div>
                <div>
                  <Label>Upload PowerPoint</Label>
                  <Input
                    type="file"
                    accept=".ppt,.pptx"
                    onChange={(e) => setPptFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddPowerPoint}>Add PowerPoint</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setPptTitle("");
                    setPptFile(null);
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : activityType === "google_drive" ? (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={googleDriveTitle}
                    onChange={(e) => setGoogleDriveTitle(e.target.value)}
                    placeholder="Enter title"
                  />
                </div>
                <div>
                  <Label>Google Drive Link</Label>
                  <Input
                    value={googleDriveUrl}
                    onChange={(e) => setGoogleDriveUrl(e.target.value)}
                    placeholder="Paste Google Drive link"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddGoogleDrive}>Add</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setGoogleDriveUrl("");
                    setGoogleDriveTitle("");
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : activityType === "video_lecture" ? (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="Enter video title"
                  />
                </div>
                <div>
                  <Label>Upload Video</Label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddVideoLecture}>Add Video</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setVideoTitle("");
                    setVideoFile(null);
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : activityType === "assignment" ? (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <RichTextEditor
                    content={newAssignment.description || ""}
                    onChange={(content) => setNewAssignment({ ...newAssignment, description: content })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Points</Label>
                    <Input
                      type="number"
                      value={newAssignment.points}
                      onChange={(e) => setNewAssignment({ ...newAssignment, points: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Passing Marks</Label>
                    <Input
                      type="number"
                      value={newAssignment.passing_marks}
                      onChange={(e) => setNewAssignment({ ...newAssignment, passing_marks: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddAssignment}>Add Assignment</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setNewAssignment({
                      title: "",
                      unit_name: "",
                      description: "",
                      points: 100,
                      passing_marks: 50,
                      assessment_brief: "",
                      due_date: ""
                    });
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : activityType === "brief" ? (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Assessment Brief Content</Label>
                  <RichTextEditor
                    content={newAssignment.assessment_brief || ""}
                    onChange={(content) => setNewAssignment({ ...newAssignment, assessment_brief: content })}
                  />
                </div>
                <div>
                  <Label>Upload File (Optional)</Label>
                  <Input
                    type="file"
                    onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddAssessmentBrief}>Add Brief</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setNewAssignment({
                      title: "",
                      unit_name: "",
                      description: "",
                      points: 100,
                      passing_marks: 50,
                      assessment_brief: "",
                      due_date: ""
                    });
                    setAssignmentFile(null);
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : activityType === "quiz" ? (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newQuiz.title}
                    onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Quiz URL</Label>
                  <Input
                    value={newQuiz.quiz_url}
                    onChange={(e) => setNewQuiz({ ...newQuiz, quiz_url: e.target.value })}
                    placeholder="Enter external quiz URL"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <RichTextEditor
                    content={newQuiz.description || ""}
                    onChange={(content) => setNewQuiz({ ...newQuiz, description: content })}
                  />
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={newQuiz.duration}
                    onChange={(e) => setNewQuiz({ ...newQuiz, duration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={newQuiz.due_date}
                    onChange={(e) => setNewQuiz({ ...newQuiz, due_date: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddQuiz}>Add Quiz</Button>
                  <Button variant="outline" onClick={() => {
                    setActivityType(null);
                    setNewQuiz({
                      title: "",
                      quiz_url: "",
                      description: "",
                      duration: 30,
                      due_date: ""
                    });
                  }}>
                    Back
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
        
        <CertificateGeneratedDialog 
          open={certificateDialogOpen} 
          onOpenChange={setCertificateDialogOpen}
        />
      </DashboardLayout>
    );
  }

  // Student view - new layout with file viewer
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <div className="border-b bg-card">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/courses">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Courses
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-bold text-lg">{course.title}</h1>
              <p className="text-xs text-muted-foreground">{course.code}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">Course Page</Button>
            <Link to="/courses">
              <Button variant="ghost" size="sm">My Courses</Button>
            </Link>
            <Badge variant="secondary">{course.category}</Badge>
          </div>
      </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center Content - File Viewer */}
        <div className="flex-1 overflow-hidden bg-background">
          <FileViewer file={selectedFile} />
        </div>
        
        {/* Right Sidebar - Course Navigation */}
        <div className="w-96 border-l bg-card overflow-auto">
          <div className="p-4">
            {/* Progress Section */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-lg font-bold text-primary">{progressPercentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-700"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedItems} of {totalItems} items completed
              </p>
            </div>

            {/* Course Units/Sections */}
            <div className="space-y-3">
              {sections.map((section, index) => {
                const sectionMaterials = materials.filter(m => m.section_id === section.id && (!m.is_hidden || isAdmin));
                const sectionAssignments = assignments.filter(a => a.unit_name === section.id && (!a.is_hidden || isAdmin));
                const sectionQuizzesInSection = sectionQuizzes.filter(q => q.section_id === section.id && (!q.is_hidden || isAdmin));
                
                return (
                  <Collapsible
                    key={section.id}
                    open={openSections[section.id]}
                    onOpenChange={() => toggleSection(section.id)}
                    className="border rounded-lg overflow-hidden"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-sm">{section.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {sectionMaterials.length + sectionAssignments.length + sectionQuizzesInSection.length} Topics
                          </p>
                        </div>
                      </div>
                      {openSections[section.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="border-t bg-muted/20">
                      <div className="p-2 space-y-1">
                        {sectionMaterials.map((material) => (
                          <button
                            key={material.id}
                            onClick={() => setSelectedFile(material.file_type === "application/brief" ? {
                              ...material,
                              _isBrief: true,
                              assessment_brief: material.description,
                              file_path: material.file_path
                            } : material)}
                            className={`flex items-center gap-2 w-full p-2 rounded text-xs hover:bg-accent transition-colors ${
                              selectedFile?.id === material.id ? 'bg-accent' : ''
                            }`}
                          >
                            <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 text-left min-w-0">
                              <p className="truncate font-medium">{material.title}</p>
                              <p className="text-muted-foreground">
                                {material.file_size ? `${(material.file_size / (1024 * 1024)).toFixed(2)} MB` : ''}
                              </p>
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={completedMaterials.has(material.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleMarkComplete(material.id);
                                }}
                                className="sr-only"
                              />
                              <div className={`w-9 h-5 rounded-full transition-colors ${completedMaterials.has(material.id) ? 'bg-primary' : 'bg-muted'} relative`}>
                                <div className={`absolute top-0.5 ${completedMaterials.has(material.id) ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full transition-all shadow`} />
                              </div>
                            </label>
                          </button>
                        ))}
                        
                        {sectionAssignments.map((assignment) => {
                          const hasSubmission = userSubmissions.some(s => s.assignment_id === assignment.id);
                          const deadline = assignment.custom_deadline || assignment.due_date;
                          return (
                            <button
                              key={assignment.id}
                              onClick={() => setSelectedFile({
                                ...assignment,
                                file_type: 'assignment',
                                _isAssignment: true,
                                course_id: courseId
                              })}
                              className={`flex items-center gap-2 w-full p-2 rounded text-xs hover:bg-accent transition-colors ${
                                selectedFile?._isAssignment && selectedFile?.id === assignment.id ? 'bg-accent' : ''
                              }`}
                            >
                              <Upload className="h-4 w-4 text-orange-500 flex-shrink-0" />
                              <div className="flex-1 text-left min-w-0">
                                <p className="truncate font-medium">{assignment.title}</p>
                                {deadline && (
                                  <p className="text-muted-foreground">
                                    Due: {new Date(deadline).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {hasSubmission && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                        
                        {sectionQuizzesInSection.map((quiz) => (
                          <button
                            key={quiz.id}
                            onClick={() => setSelectedFile({
                              ...quiz,
                              file_type: 'quiz',
                              _isQuiz: true,
                            })}
                            className={`flex items-center gap-2 w-full p-2 rounded text-xs hover:bg-accent transition-colors ${
                              selectedFile?._isQuiz && selectedFile?.id === quiz.id ? 'bg-accent' : ''
                            }`}
                          >
                            <img src={quizIcon} alt="Quiz" className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 text-left min-w-0">
                              <p className="truncate font-medium">{quiz.title}</p>
                              <p className="text-muted-foreground">Quiz</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Download Section - Only show for file materials, not assignments or quizzes */}
      {selectedFile && 
       selectedFile.file_path && 
       !selectedFile._isQuiz && 
       !selectedFile._isAssignment && 
       selectedFile.file_type !== "text/html" && (
        <div className="border-t bg-card p-4 flex items-center justify-between">
          <span className="text-sm font-medium">Download the file</span>
          <Button onClick={() => {
            if (selectedFile.file_path) {
              downloadMaterial(selectedFile.file_path, selectedFile.title);
            }
          }}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      )}
      
      <CertificateGeneratedDialog 
        open={certificateDialogOpen} 
        onOpenChange={setCertificateDialogOpen}
      />
    </div>
  );
}
