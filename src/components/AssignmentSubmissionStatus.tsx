import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface AssignmentSubmissionStatusProps {
  assignment: {
    id: string;
    title: string;
    due_date: string | null;
    points: number | null;
    attempts: number;
  };
  submission: {
    id: string;
    submitted_at: string | null;
    status: string | null;
    marks_obtained: number | null;
    file_path: string | null;
    feedback: string | null;
    graded_at: string | null;
    graded_by: string | null;
  };
  attemptNumber: number;
  totalAttempts: number;
  onResubmit?: () => void;
}

export function AssignmentSubmissionStatus({ assignment, submission, attemptNumber, totalAttempts, onResubmit }: AssignmentSubmissionStatusProps) {
  const [graderName, setGraderName] = useState<string | null>(null);
  const canDelete = submission.graded_at === null && assignment.due_date && new Date() < new Date(assignment.due_date);
  const hasAttemptsRemaining = attemptNumber < totalAttempts;

  useEffect(() => {
    if (submission.graded_by) {
      fetchGraderName();
    }
  }, [submission.graded_by]);

  const fetchGraderName = async () => {
    if (!submission.graded_by) return;
    
    // Grader name lookup not implemented; show placeholder
    setGraderName('Instructor');
  };

  const handleDeleteSubmission = async () => {
    if (!confirm("Are you sure you want to delete this submission? You can resubmit before the deadline.")) {
      return;
    }

    try {
      await apiFetch(`/submissions/${submission.id}`, { method: "DELETE" });
      toast.success("Submission deleted. You can now resubmit.");
      if (onResubmit) onResubmit();
    } catch (error: any) {
      console.error("Error deleting submission:", error);
      toast.error("Failed to delete submission");
    }
  };

  const calculateTimeRemaining = () => {
    if (!submission.submitted_at || !assignment.due_date) return null;
    
    const submittedDate = new Date(submission.submitted_at);
    const dueDate = new Date(assignment.due_date);
    const diffMs = dueDate.getTime() - submittedDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) {
      const absDiffHours = Math.abs(diffHours);
      const absDiffMins = Math.abs(diffMins);
      return {
        text: `Assignment was submitted ${absDiffHours} hours ${absDiffMins} mins late`,
        isLate: true
      };
    }
    
    return {
      text: `Assignment was submitted ${diffHours} hours ${diffMins} mins early`,
      isLate: false
    };
  };

  const timeRemaining = calculateTimeRemaining();
  const fileName = submission.file_path ? submission.file_path.split('/').pop() : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{assignment.title}</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          {assignment.due_date && (
            <>
              <div>
                <span className="font-medium">Opened:</span> {format(new Date(assignment.due_date), "EEEE, MMMM d, yyyy, h:mm a")}
              </div>
              <div>
                <span className="font-medium">Due:</span> {format(new Date(assignment.due_date), "EEEE, MMMM d, yyyy, h:mm a")}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Submission Status</h3>
        
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium bg-muted/50 w-48">Attempt number</td>
                <td className="py-3 px-4">This is attempt {attemptNumber} of {totalAttempts}.</td>
              </tr>
              
              <tr className="border-b">
                <td className="py-3 px-4 font-medium bg-muted/50">Submission status</td>
                <td className="py-3 px-4">
                  <span className="inline-block px-3 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                    {submission.status === 'submitted' ? 'Submitted for grading' : submission.status || 'Not submitted'}
                  </span>
                </td>
              </tr>
              
              <tr className="border-b">
                <td className="py-3 px-4 font-medium bg-muted/50">Grading status</td>
                <td className="py-3 px-4">
                  {submission.graded_at ? (
                    <span>Graded - {submission.marks_obtained}/{assignment.points} points</span>
                  ) : (
                    <span>Not graded</span>
                  )}
                </td>
              </tr>
              
              {timeRemaining && (
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium bg-muted/50">Time remaining</td>
                  <td className={`py-3 px-4 ${timeRemaining.isLate ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    {timeRemaining.text}
                  </td>
                </tr>
              )}
              
              {submission.submitted_at && (
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium bg-muted/50">Last modified</td>
                  <td className="py-3 px-4">
                    {format(new Date(submission.submitted_at), "EEEE, MMMM d, yyyy, h:mm a")}
                  </td>
                </tr>
              )}
              
              {fileName && (
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium bg-muted/50">File submissions</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{fileName}</span>
                      {submission.submitted_at && (
                        <span className="text-muted-foreground text-sm ml-2">
                          {format(new Date(submission.submitted_at), "MMMM d yyyy, h:mm a")}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              
              <tr>
                <td className="py-3 px-4 font-medium bg-muted/50">Submission comments</td>
                <td className="py-3 px-4">
                  <button className="text-primary hover:underline">
                    Comments (0)
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {submission.graded_at && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Feedback</h3>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium bg-muted/50 w-48">Grade</td>
                    <td className="py-3 px-4">
                      {submission.marks_obtained} / {assignment.points}
                    </td>
                  </tr>
                  
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium bg-muted/50">Graded on</td>
                    <td className="py-3 px-4">
                      {format(new Date(submission.graded_at), "EEEE, MMMM d, yyyy, h:mm a")}
                    </td>
                  </tr>
                  
                  {submission.graded_by && (
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium bg-muted/50">Graded by</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block px-2 py-0.5 rounded bg-muted text-xs">BY</span>
                          <span>{graderName || 'Instructor'}</span>
                        </span>
                      </td>
                    </tr>
                  )}
                  
                  <tr>
                    <td className="py-3 px-4 font-medium bg-muted/50">Feedback comments</td>
                    <td className="py-3 px-4">
                      {submission.feedback || "No feedback provided"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(canDelete || hasAttemptsRemaining) && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">
                  {hasAttemptsRemaining ? `You have ${totalAttempts - attemptNumber} attempt(s) remaining` : 'Want to resubmit?'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasAttemptsRemaining 
                    ? 'You can submit again before the deadline.' 
                    : 'You can delete this submission and upload a new one before the deadline.'}
                </p>
              </div>
              {canDelete && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSubmission}
                  className="ml-4"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Submission
                </Button>
              )}
              {hasAttemptsRemaining && !canDelete && (
                <Button 
                  onClick={onResubmit}
                  className="ml-4"
                >
                  Submit Again
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
