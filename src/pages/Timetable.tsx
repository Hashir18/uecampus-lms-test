import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight, Clock, GraduationCap, X, Upload, FileText } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";

interface TimetableEntry {
  id: string;
  course_name: string;
  course_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  color: string;
  user_id?: string;
  type?: 'class' | 'assignment' | 'quiz';
  due_date?: string;
  course_id?: string;
  assignment_id?: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Timetable() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [selectedUser, setSelectedUser] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newEntry, setNewEntry] = useState({
    course_id: "",
    end_time: "10:00",
    color: "#8B5CF6"
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedUserForUpload, setSelectedUserForUpload] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadUsers();
      loadCourses().then(() => loadTimetable());
      loadUserDocuments();
    }
  }, [user]);

  const loadUsers = async () => {
    if (!isAdmin) return;
    try {
      const data = await apiFetch<any[]>("/users");
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  const loadCourses = async () => {
    try {
      const data = await apiFetch<any[]>("/courses");
      setCourses(data || []);
      return data || [];
    } catch {
      setCourses([]);
      return [];
    }
  };

  const loadTimetable = async () => {
    if (!user) return;

    try {
      // Ensure we have courses loaded for mapping
      const courseList = courses.length ? courses : await loadCourses();
      const courseMap = new Map(courseList.map((c) => [c.id, c]));

      const [timetableData, feedData] = await Promise.all([
        apiFetch<TimetableEntry[]>("/timetable"),
        apiFetch<{ assignments: any[]; quizzes: any[] }>("/feed/upcoming"),
      ]);

      const timetableEntries: TimetableEntry[] = (timetableData || []).map((entry) => ({
        ...entry,
        type: "class" as const,
      }));

      const assignmentEntries: TimetableEntry[] = (feedData.assignments || [])
        .filter((a) => a.due_date || a.custom_deadline)
        .map((a) => {
          const deadline = a.custom_deadline || a.due_date;
          const utcDate = new Date(deadline);
          const uaeDate = new Date(utcDate.getTime() + 4 * 60 * 60 * 1000);
          const courseMeta = courseMap.get(a.course);
          return {
            id: `assignment-${a.id}`,
            course_name: a.title,
            course_code: courseMeta?.code || "",
            day_of_week: format(uaeDate, "EEEE"),
            start_time: format(uaeDate, "h:mm a"),
            end_time: "",
            color: "#ef4444",
            type: "assignment" as const,
            due_date: deadline,
            course_id: a.course,
            assignment_id: a.id,
          };
        });

      const quizEntries: TimetableEntry[] = (feedData.quizzes || [])
        .filter((q) => q.due_date || q.custom_deadline)
        .map((q) => {
          const deadline = q.custom_deadline || q.due_date;
          const utcDate = new Date(deadline);
          const uaeDate = new Date(utcDate.getTime() + 4 * 60 * 60 * 1000);
          const courseMeta = courseMap.get(q.course_id);
          return {
            id: `quiz-${q.id}`,
            course_name: q.title,
            course_code: courseMeta?.code || "",
            day_of_week: format(uaeDate, "EEEE"),
            start_time: format(uaeDate, "h:mm a"),
            end_time: "",
            color: "#8b5cf6",
            type: "quiz" as const,
            due_date: deadline,
            course_id: q.course_id,
          };
        });

      setEntries([...timetableEntries, ...assignmentEntries, ...quizEntries]);
    } catch (err) {
      console.error("Error loading timetable:", err);
    }
  };

  const handleAddEntry = async () => {
    if (!user || !newEntry.course_id || !selectedDate) {
      toast.error("Please fill in all required fields and select a date");
      return;
    }

    const selectedCourse = courses.find((c) => c.id === newEntry.course_id);
    if (!selectedCourse) return;

    const dayOfWeek = format(selectedDate, "EEEE");
    const startTime = format(selectedDate, "HH:mm");

    try {
      await apiFetch("/timetable", {
        method: "POST",
        body: JSON.stringify({
          course_name: selectedCourse.title,
          course_code: selectedCourse.code,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: newEntry.end_time,
          color: newEntry.color,
        }),
      });

      toast.success("Entry added successfully");
      setDialogOpen(false);
      setNewEntry({
        course_id: "",
        end_time: "10:00",
        color: "#8B5CF6",
      });
      setSelectedUser("");
      setSelectedDate(new Date());
      loadTimetable();
    } catch (error: any) {
      toast.error(error.message || "Failed to add entry");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await apiFetch(`/timetable/${id}`, { method: "DELETE" });
      toast.success("Entry deleted");
      loadTimetable();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete entry");
    }
  };

  const getEntriesForDay = (day: string) => {
    return entries.filter(e => e.day_of_week === day);
  };

  const getEntriesForDate = (date: Date) => {
    return entries.filter(e => {
      if (e.due_date) {
        return isSameDay(new Date(e.due_date), date);
      }
      if (e.day_of_week) {
        const dayName = format(date, 'EEEE');
        return e.day_of_week === dayName;
      }
      return false;
    });
  };

  const handleEntryClick = (entry: TimetableEntry) => {
    setSelectedEntry(entry);
    setDetailDialogOpen(true);
  };

  const handleGoToActivity = () => {
    if (!selectedEntry || !selectedEntry.course_id) return;
    
    // Navigate to the course detail page where the assignment/quiz is located
    navigate(`/courses/${selectedEntry.course_id}`);
    setDetailDialogOpen(false);
  };

  const loadUserDocuments = async () => {
    if (!user) return;
    
    try {
      const data = await apiFetch<any[]>("/documents");
      setUserDocuments(data || []);
      
      // Auto-select the first document if available
      if (data && data.length > 0) {
        setSelectedDocument(data[0]);
        await loadPdfUrl(data[0].id);
      }
    } catch (error: any) {
      console.error("Error loading user documents:", error);
    }
  };

  const loadPdfUrl = async (docId: string) => {
    try {
      const res = await apiFetch<{ url: string }>(`/documents/${docId}/signed-url`);
      setPdfUrl(res.url);
    } catch (error: any) {
      console.error("Error loading PDF URL:", error);
      toast.error("Failed to load PDF");
    }
  };

  const handleUploadPDF = async () => {
    if (!pdfFile || !selectedUserForUpload || !pdfTitle) {
      toast.error("Please fill in all fields and select a PDF");
      return;
    }

    try {
      const form = new FormData();
      form.append("file", pdfFile);
      form.append("title", pdfTitle);
      form.append("user_id", selectedUserForUpload);
      await apiFetch("/documents", { method: "POST", body: form });

      toast.success("PDF uploaded successfully");
      setUploadDialogOpen(false);
      setPdfFile(null);
      setPdfTitle("");
      setSelectedUserForUpload("");
      loadUserDocuments();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload PDF");
    }
  };

  const handleDeleteDocument = async (docId: string, filePath: string) => {
    if (!confirm("Delete this document?")) return;
    
    try {
      await apiFetch(`/documents/${docId}`, { method: "DELETE" });

      toast.success("Document deleted");
      loadUserDocuments();
      if (selectedDocument?.id === docId) {
        setSelectedDocument(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete document");
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Calendar
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your schedule and deadlines
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload PDF for User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload PDF for User</DialogTitle>
                    <DialogDescription>
                      Select a user and upload a PDF document that will be displayed below their calendar
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <Select value={selectedUserForUpload} onValueChange={setSelectedUserForUpload}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Document Title</Label>
                      <Input
                        value={pdfTitle}
                        onChange={(e) => setPdfTitle(e.target.value)}
                        placeholder="e.g., Study Materials, Schedule"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PDF File</Label>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <Button onClick={handleUploadPDF} className="w-full">
                      Upload PDF
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Timetable Entry</DialogTitle>
                  </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={newEntry.course_id} onValueChange={(value) => setNewEntry({ ...newEntry, course_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
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

                <div className="space-y-2">
                  <Label>Select Date & Time</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                    />
                  </div>
                  {selectedDate && (
                    <p className="text-sm text-muted-foreground text-center">
                      Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy HH:mm')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={newEntry.end_time}
                    onChange={(e) => setNewEntry({ ...newEntry, end_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    value={newEntry.color}
                    onChange={(e) => setNewEntry({ ...newEntry, color: e.target.value })}
                  />
                </div>

                <Button onClick={handleAddEntry} className="w-full">
                  Add Entry
                </Button>
              </div>
            </DialogContent>
          </Dialog>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl font-bold">
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm py-2 text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const dayEntries = getEntriesForDate(day);
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-card'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEntries.slice(0, 3).map(entry => (
                        <div
                          key={entry.id}
                          className="text-xs p-1 rounded flex items-start gap-1 hover:bg-muted/50 cursor-pointer group"
                          onClick={() => handleEntryClick(entry)}
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: entry.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-medium">{entry.course_name}</span>
                              {isAdmin && entry.type === 'class' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEntry(entry.id);
                                  }}
                                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {entry.start_time}
                            </div>
                          </div>
                        </div>
                      ))}
                      {dayEntries.length > 3 && (
                        <div className="text-xs text-primary font-medium pl-3">
                          {dayEntries.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <DialogTitle className="text-lg font-semibold">
              {selectedEntry?.course_name}
              {selectedEntry?.type === 'assignment' ? ' closes' : selectedEntry?.type === 'quiz' ? ' closes' : ''}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {selectedEntry.due_date 
                    ? (() => {
                        const utcDate = new Date(selectedEntry.due_date);
                        // Convert UTC to UAE time (UTC+4)
                        const uaeDate = new Date(utcDate.getTime() + (4 * 60 * 60 * 1000));
                        return format(uaeDate, 'EEEE, MMMM dd, yyyy h:mm a');
                      })()
                    : `${selectedEntry.day_of_week}, ${selectedEntry.start_time}`
                  }
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="capitalize">
                  {selectedEntry.type === 'assignment' ? 'Assignment' : selectedEntry.type === 'quiz' ? 'Quiz' : 'Course event'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-primary">{selectedEntry.course_code}</span>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  variant="link" 
                  className="text-primary px-0"
                  onClick={handleGoToActivity}
                >
                  Go to activity →
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Documents Section */}
      {userDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                My Documents
              </CardTitle>
              {userDocuments.length > 1 && (
                  <Select value={selectedDocument?.id || ""} onValueChange={async (id) => {
                    const doc = userDocuments.find(d => d.id === id);
                    setSelectedDocument(doc);
                    if (doc) {
                    await loadPdfUrl(doc.id);
                  }
                }}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Select document" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDocuments.map(doc => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedDocument && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedDocument.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Added {format(new Date(selectedDocument.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDocument(selectedDocument.id, selectedDocument.file_path)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden bg-muted/20">
                  {pdfUrl ? (
                    <iframe
                      src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full h-[600px]"
                      title={selectedDocument.title}
                    />
                  ) : (
                    <div className="w-full h-[600px] flex items-center justify-center">
                      <p className="text-muted-foreground">Loading PDF...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
