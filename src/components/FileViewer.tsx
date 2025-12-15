// src/components/FileViewer.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, File as FileIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignmentSubmissionStatus } from "@/components/AssignmentSubmissionStatus";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

/* ============================== Types & utils ============================== */
interface LMSFile {
  title: string;
  file_path?: string;
  file_type: string;
  description?: string;
  _isAssignment?: boolean;
  _isQuiz?: boolean;
  _isBrief?: boolean;
  quiz_url?: string;
  assessment_brief?: string;
  id?: string;
  feedback?: string;
  points?: number;
  passing_marks?: number;
  due_date?: string;
  attempts?: number;
  course?: string;
  course_id?: string;
}

interface FileViewerProps {
  file: LMSFile | null;
}

const EXT = (p?: string) => (p ? p.toLowerCase().split(".").pop() || "" : "");
const isDocExt = (p?: string) => ["doc", "docx"].includes(EXT(p));
const isXlsExt = (p?: string) => ["xls", "xlsx"].includes(EXT(p));
const isOfficeExt = (p?: string) => ["doc", "docx", "xls", "xlsx"].includes(EXT(p));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const isHttpsPublic = (urlStr?: string) => {
  if (!urlStr) return false;
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    if (!/^https?:$/i.test(url.protocol)) return false;
    if (["localhost", "127.0.0.1"].includes(host)) return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
};

const normalizeUrl = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${window.location.origin}${normalized}`;
};

const googleViewer = (u: string) => `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(u)}`;

const toGoogleDrivePreview = (u?: string) => {
  if (!u) return "";
  try {
    const url = new URL(u);
    if (url.hostname.includes("drive.google.com")) {
      url.pathname = url.pathname.replace(/\/view.*$/, "/preview");
      url.searchParams.set("usp", "embed");
      return url.toString();
    }
    return u;
  } catch {
    return u || "";
  }
};

/* ============================== Inline PDF (no iframes) ============================== */
/* why: use local worker to avoid CSP/CDN issues */
function InlinePdfViewer({ url, initialScale = 1.25 }: { url: string; initialScale?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState(initialScale);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      if (!url || !containerRef.current) return;

      try {
        const pdfjsLib: any = await import("pdfjs-dist/build/pdf");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"; // serve from /public

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ab = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: ab }).promise;

        const container = containerRef.current!;
        container.innerHTML = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 16px auto";
          container.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        setLoading(false);
      } catch (e: any) {
        setErr(e?.message || "Failed to render PDF");
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [url, scale]);

  return (
    <div className="w-full h-full overflow-auto">
      <div className="sticky top-0 z-10 flex gap-2 items-center justify-end p-2 border-b bg-background">
        <Button variant="outline" size="sm" onClick={() => setScale((s) => clamp(Math.round((s - 0.1) * 10) / 10, 0.5, 3))}>
          −
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => setScale((s) => clamp(Math.round((s + 0.1) * 10) / 10, 0.5, 3))}>
          +
        </Button>
      </div>

      {err ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3 p-8">
          <p className="text-sm text-muted-foreground">PDF preview failed: {err}</p>
        </div>
      ) : (
        <>
          {loading && (
            <div className="flex items-center justify-center p-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          )}
          <div ref={containerRef} className="px-2 pb-8" />
        </>
      )}
    </div>
  );
}

/* ============================== Main ============================== */
export function FileViewer({ file }: FileViewerProps) {
  const { user } = useAuth();

  // data
  const [fileUrl, setFileUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // assignments
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(file?.attempts || 2);

  // office local render (Word/Excel)
  const [officeHtml, setOfficeHtml] = useState<string>("");

  // type guards
  const pathOrTitle = `${file?.file_path || ""}|${file?.title || ""}`;
  const isPdf = useMemo(() => /pdf/i.test(file?.file_type || "") || EXT(pathOrTitle) === "pdf", [file, pathOrTitle]);
  const isVideo = useMemo(() => /video/i.test(file?.file_type || ""), [file]);
  const isImage = useMemo(() => /image/i.test(file?.file_type || ""), [file]);
  const isTextLesson = useMemo(() => /text\/html/i.test(file?.file_type || ""), [file]);
  const isGoogleDrive = useMemo(() => {
    const p = file?.file_path || "";
    return file?.file_type === "google_drive" || /drive\.google\.com|docs\.google\.com/i.test(p);
  }, [file]);
  const isWord = useMemo(() => {
    const ft = file?.file_type || "";
    return /msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/document/i.test(ft) || isDocExt(pathOrTitle);
  }, [file, pathOrTitle]);
  const isExcel = useMemo(() => {
    const ft = file?.file_type || "";
    return /vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i.test(ft) || isXlsExt(pathOrTitle);
  }, [file, pathOrTitle]);

  // loaders
  const loadFile = async () => {
    if (!file || !file.file_path) {
      setLoading(false);
      return;
    }
    try {
      let url = "";
      if (file.id) {
        const res = await apiFetch<{ url: string }>(`/materials/${file.id}/signed-url`);
        url = res.url;
      } else {
        url = file.file_path;
      }
      setFileUrl(normalizeUrl(url));
    } catch {
      toast.error("Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  const loadUserSubmissions = async () => {
    if (!file || !file._isAssignment || !user) return;
    try {
      const data = await apiFetch<any[]>(`/submissions?mine=true`);
      setUserSubmissions((data || []).filter((s) => s.assignment_id === file.id));
    } catch {}
  };

  const downloadFile = () => {
    if (!file || !fileUrl) return;
    try {
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = file.title || "download";
      a.rel = "noopener";
      a.target = "_blank";
      a.click();
    } catch {
      toast.error("Failed to download file");
    }
  };

  // assignment submit (keep INSIDE to avoid TS2304)
  const handleSubmitAssignment = async () => {
    if (!file || !file._isAssignment || !submissionFile) {
      toast.error("Please select a file to submit");
      return;
    }
    setSubmitting(true);
    try {
      if (!user) throw new Error("Not authenticated");
      const body = new FormData();
      body.append("file", submissionFile);
      if (file.course_id) body.append("course_id", file.course_id);
      await apiFetch(`/assignments/${file.id}/submit`, { method: "POST", body });
      toast.success("Assignment submitted successfully!");
      setSubmissionFile(null);
      setShowSubmissionForm(false);
      await loadUserSubmissions();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // local Office render (private Word/Excel)
  async function renderOfficeLocally() {
    if (!fileUrl) return;
    try {
      setOfficeHtml("");
      const res = await fetch(fileUrl, { credentials: "include" }); // signed/private ok
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ab = await res.arrayBuffer();

      if (isWord) {
        const mammoth = await import("mammoth/mammoth.browser");
        const { value } = await mammoth.convertToHtml({ arrayBuffer: ab });
        setOfficeHtml(`<div class="prose dark:prose-invert max-w-none">${value}</div>`);
        return;
      }

      if (isExcel) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(ab);
        const htmlParts: string[] = [];
        wb.SheetNames.forEach((name) => {
          const sheet = wb.Sheets[name];
          const html = XLSX.utils.sheet_to_html(sheet, { id: name });
          htmlParts.push(`<h3 class="text-lg font-semibold my-3">${name}</h3>${html}`);
        });
        setOfficeHtml(
          `<div class="max-w-full overflow-auto [&_table]:w-auto [&_table]:border [&_th]:border [&_td]:border [&_td]:px-2 [&_th]:px-2">${htmlParts.join(
            ""
          )}</div>`
        );
        return;
      }
    } catch {
      setOfficeHtml("");
    }
  }

  // effects
  useEffect(() => {
    if (!file) return;

    if (!file._isAssignment && !file._isQuiz) {
      if (file.file_path && file.file_path.includes(".")) loadFile();
      else if (file.file_type !== "google_drive" && !file._isBrief) loadFile();
    }

    if (file._isAssignment) {
      loadUserSubmissions();
      setTotalAttempts(file.attempts || 2);
    }

    setOfficeHtml("");
    setLoading(true);
  }, [file?.id]);

  useEffect(() => {
    if (!(isWord || isExcel)) return;
    if (!fileUrl) return;
    const publicUrl = isHttpsPublic(fileUrl);
    if (!publicUrl) renderOfficeLocally();
  }, [fileUrl, isWord, isExcel]);

  /* ============================== Views ============================== */
  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center p-12">
          <FileIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No file selected</h3>
          <p className="text-muted-foreground">Select a file from the sidebar to view it here</p>
        </div>
      </div>
    );
  }

  // Quiz
  if (file._isQuiz && file.quiz_url) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 border-b bg-card">
          <h2 className="text-2xl font-bold">{file.title}</h2>
          {file.description && <p className="text-muted-foreground mt-1">{file.description}</p>}
        </div>
        <div className="flex-1">
          <iframe
            src={file.quiz_url}
            className="w-full h-full border-0"
            title={file.title}
            allow="fullscreen; autoplay"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    );
  }

  // Brief
  if (file._isBrief) {
    const canUseGoogle = isHttpsPublic(fileUrl);
    const briefIsPdf = isPdf;
    const briefSrc = briefIsPdf ? (canUseGoogle ? googleViewer(fileUrl) : "") : fileUrl;

    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 border-b flex items-center justify-between bg-background sticky top-0 z-10">
          <h3 className="font-semibold text-lg">{file.title}</h3>
          {file.file_path && file.file_path.includes(".") && (
            <Button variant="outline" size="sm" onClick={downloadFile}>
              <Download className="h-4 w-4 mr-2" />
              Download Brief
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {file.file_path && file.file_path.includes(".") ? (
            briefIsPdf ? (
              canUseGoogle ? (
                <iframe
                  src={briefSrc}
                  className="w-full h-full border-0"
                  title={file.title}
                  onLoad={() => setLoading(false)}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <InlinePdfViewer url={fileUrl} />
              )
            ) : (
              <iframe
                src={briefSrc}
                className="w-full h-full border-0"
                title={file.title}
                onLoad={() => setLoading(false)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )
          ) : (
            <div className="max-w-4xl mx-auto p-8">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Brief</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">
                      {file.assessment_brief || file.description || "No brief content available"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assignment
  if (file._isAssignment) {
    const latestSubmission = userSubmissions.length > 0 ? userSubmissions[0] : null;
    const attemptNumber = userSubmissions.length;
    const hasAttemptsRemaining = attemptNumber < totalAttempts;

    if (latestSubmission && (!showSubmissionForm || !hasAttemptsRemaining)) {
      return (
        <div className="h-full overflow-auto bg-background">
          <div className="max-w-4xl mx-auto p-8">
            <AssignmentSubmissionStatus
              assignment={{
                id: file.id || "",
                title: file.title,
                due_date: file.due_date || null,
                points: file.points || 100,
                attempts: file.attempts || 2,
              }}
              submission={latestSubmission}
              attemptNumber={attemptNumber}
              totalAttempts={totalAttempts}
              onResubmit={() => {
                if (hasAttemptsRemaining) setShowSubmissionForm(true);
                else {
                  setUserSubmissions([]);
                  loadUserSubmissions();
                }
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto bg-background">
        <div className="max-w-4xl mx-auto p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">{file.title}</h2>
            {file.description && <p className="text-muted-foreground">{file.description}</p>}
            <div className="flex gap-4 mt-3 text-sm">
              <div><span className="font-semibold">Total Marks:</span> {file.points}</div>
              <div><span className="font-semibold">Passing Marks:</span> {file.passing_marks}</div>
              {file.due_date && <div><span className="font-semibold">Due:</span> {new Date(file.due_date).toLocaleDateString()}</div>}
              <div><span className="font-semibold">Attempts:</span> {attemptNumber}/{totalAttempts}</div>
            </div>
          </div>

          {latestSubmission && showSubmissionForm && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Submitting attempt {attemptNumber + 1} of {totalAttempts}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShowSubmissionForm(false)} className="mt-2">
                View Previous Submission
              </Button>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Submit Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Choose File</Label>
                <Input id="file-upload" type="file" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleSubmitAssignment} disabled={!submissionFile || submitting} className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                {submitting ? "Submitting..." : "Submit Assignment"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Generic viewer (no PPT anywhere)
  const publicUrl = isHttpsPublic(fileUrl);
  const isDrive = isGoogleDrive && file.file_path;
  const officeCandidate = isOfficeExt(file?.file_path || file?.title);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b flex items-center justify-between bg-background sticky top-0 z-10">
        <h3 className="font-semibold text-lg">{file.title}</h3>
        <Button variant="outline" size="sm" onClick={downloadFile}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      <div className="flex-1 overflow-auto relative">
        {/* Google Drive */}
        {isDrive && (
          <iframe
            src={toGoogleDrivePreview(file.file_path!)}
            className="w-full h-full border-0"
            title={file.title}
            onLoad={() => setLoading(false)}
            allow="autoplay"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}

        {/* PDF — inline renderer (no iframe) */}
        {isPdf && fileUrl && <InlinePdfViewer url={fileUrl} />}

        {/* Video */}
        {isVideo && fileUrl && (
          <div className="flex items-center justify-center h-full p-8">
            <video src={fileUrl} controls className="w-full max-w-5xl rounded-lg shadow-lg" />
          </div>
        )}

        {/* Image */}
        {isImage && fileUrl && (
          <div className="flex items-center justify-center h-full p-8">
            <img src={fileUrl} alt={file.title} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
          </div>
        )}

        {/* HTML lesson */}
        {isTextLesson && file.description && (
          <div className="max-w-4xl mx-auto p-8">
            <div
              className="prose prose-lg dark:prose-invert max-w-none 
                [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:border-0
                [&_video]:w-full [&_video]:max-w-full [&_video]:h-auto [&_video]:rounded-lg [&_video]:shadow-lg
                [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg"
              dangerouslySetInnerHTML={{ __html: file.description }}
            />
          </div>
        )}

        {/* Word/Excel: public → Google Viewer; private → local render */}
        {(isWord || isExcel) && fileUrl && officeCandidate && publicUrl && !officeHtml && (
          <iframe
            src={googleViewer(fileUrl)}
            className="w-full h-full border-0"
            title={file.title}
            onLoad={() => setLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}

        {(isWord || isExcel) && !publicUrl && !officeHtml && (
          <div className="p-6 text-center text-sm text-muted-foreground">Preparing private preview…</div>
        )}

        {(isWord || isExcel) && officeHtml && (
          <div className="max-w-5xl mx-auto p-6">
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: officeHtml }} />
          </div>
        )}

        {/* Unknown */}
        {!isPdf && !isVideo && !isImage && !isTextLesson && !(isWord || isExcel) && !isGoogleDrive && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
              <Button onClick={downloadFile}>
                <Download className="h-4 w-4 mr-2" />
                Download to view
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
