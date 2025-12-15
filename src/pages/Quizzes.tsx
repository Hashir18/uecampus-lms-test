import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, PlayCircle, Plus, Trash2, Copy, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface Quiz {
  id: string;
  title: string;
  course_id: string;
  section_id: string | null;
  quiz_url: string;
  description?: string | null;
  due_date?: string | null;
  duration: number | null;
  status: string | null;
  difficulty: string | null;
  best_score?: number | null;
  user_best_score?: number | null;
}

export default function Quizzes() {
  const { isEditMode } = useEditMode();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  const fetchQuizzes = async () => {
    try {
      const data = await apiFetch<Quiz[]>("/quizzes");
      let quizzesWithProgress = data;

      if (user) {
        const progress = await apiFetch<
          { quiz_id?: string; percentage?: number; item_type?: string }[]
        >("/progress");
        quizzesWithProgress = data.map((quiz) => {
          const userProgress = progress.find(
            (p) => p.item_type === "quiz" && p.quiz_id === quiz.id
          );
          return {
            ...quiz,
            user_best_score: userProgress?.percentage ?? null,
          };
        });
      }

      setQuizzes(quizzesWithProgress);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const updateQuiz = async (id: string, field: string, value: any) => {
    try {
      await apiFetch(`/quizzes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      setQuizzes(quizzes.map(q => q.id === id ? { ...q, [field]: value } : q));
    } catch (error: any) {
      toast.error("Failed to update quiz");
    }
  };

  const deleteQuiz = async (id: string) => {
    try {
      await apiFetch(`/quizzes/${id}`, { method: "DELETE" });
      setQuizzes(quizzes.filter(q => q.id !== id));
      toast.success("Quiz deleted");
    } catch (error: any) {
      toast.error("Failed to delete quiz");
    }
  };

  const addQuiz = async () => {
    try {
      const courseId = window.prompt("Enter course ID for this quiz:");
      const sectionId = window.prompt("Enter section ID for this quiz:");
      const quizUrl = window.prompt("Enter quiz URL (iframe link):", "https://example.com/quiz");

      if (!courseId || !sectionId || !quizUrl) {
        toast.error("Course ID, section ID, and quiz URL are required");
        return;
      }

      const payload = {
        course_id: courseId,
        section_id: sectionId,
        title: "New Quiz",
        quiz_url: quizUrl,
        duration: 30,
        difficulty: "Medium",
        status: "available",
      };

      const res = await apiFetch<{ id: string }>("/quizzes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setQuizzes([{ ...payload, id: res.id }, ...quizzes]);
      toast.success("Quiz added");
    } catch (error: any) {
      toast.error("Failed to add quiz");
    }
  };

  const duplicateQuiz = async (quiz: Quiz) => {
    try {
      const payload = {
        course_id: quiz.course_id,
        section_id: quiz.section_id,
        title: `${quiz.title} (Copy)`,
        quiz_url: quiz.quiz_url,
        duration: quiz.duration,
        difficulty: quiz.difficulty,
        status: quiz.status,
        best_score: quiz.best_score,
      };

      const res = await apiFetch<{ id: string }>("/quizzes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setQuizzes([{ ...quiz, ...payload, id: res.id }, ...quizzes]);
      toast.success("Quiz duplicated");
    } catch (error: any) {
      toast.error("Failed to duplicate quiz");
    }
  };

  if (loading) return <div className="animate-fade-in">Loading...</div>;

  const completed = quizzes.filter(q => q.user_best_score !== null && q.user_best_score !== undefined).length;
  const avgScore = quizzes.filter(q => q.user_best_score).reduce((sum, q) => sum + (q.user_best_score || 0), 0) / (completed || 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quizzes</h1>
        {isEditMode && (
          <div className="flex gap-2">
            <Badge variant="outline" className="animate-pulse">
              <Edit2 className="h-3 w-3 mr-1" />
              Edit Mode Active
            </Badge>
            <Button onClick={addQuiz} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Quiz
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 bg-gradient-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/20">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-success/20">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {quizzes.map((q) => (
          <Card key={q.id} className="p-6 hover:shadow-glow transition-all bg-gradient-card relative group">
            {isEditMode && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => duplicateQuiz(q)}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => deleteQuiz(q.id)}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="space-y-4">
              {isEditMode ? (
                <>
                  <Input
                    value={q.course_id}
                    onChange={(e) => updateQuiz(q.id, "course_id", e.target.value)}
                    placeholder="Course ID"
                  />
                  <Input
                    value={q.title}
                    onChange={(e) => updateQuiz(q.id, "title", e.target.value)}
                    placeholder="Quiz Title"
                  />
                  <Input
                    value={q.quiz_url}
                    onChange={(e) => updateQuiz(q.id, "quiz_url", e.target.value)}
                    placeholder="Quiz URL"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={q.duration || 0}
                      onChange={(e) => updateQuiz(q.id, "duration", parseInt(e.target.value))}
                      placeholder="Duration"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Badge variant="secondary">{q.course}</Badge>
                    <h3 className="text-xl font-semibold mt-2">{q.title}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Questions</p>
                      <p className="font-semibold">{q.questions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">{q.duration} min</p>
                    </div>
                  </div>
                  {q.user_best_score !== null && q.user_best_score !== undefined && (
                    <div>
                      <Progress value={q.user_best_score} className="h-2" />
                      <p className="text-sm mt-1">Your Best: {q.user_best_score}%</p>
                    </div>
                  )}
                  <Button className="w-full bg-gradient-primary">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {q.status === "available" ? "Start Quiz" : "Retake"}
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
