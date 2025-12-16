import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface PowerPointPreviewProps {
  fileUrl: string;
  title: string;
}

export const PowerPointPreview: React.FC<PowerPointPreviewProps> = ({ fileUrl, title }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let viewer: any;
    let timeout: number | undefined;

    const load = async () => {
      if (!containerRef.current) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch the PPTX/PPT file using the signed URL from storage
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to fetch presentation");

        const buffer = await response.arrayBuffer();
        if (isCancelled) return;

        // Dynamically import to avoid increasing initial bundle size
        const pptx = await import("pptx-preview");
        const init = (pptx as any).init ?? (pptx as any).default ?? pptx;

        if (!containerRef.current) return;

        viewer = init(containerRef.current!, {
          width: containerRef.current!.clientWidth || 960,
          height: containerRef.current!.clientHeight || 540,
        });

        await viewer.preview(buffer);
        if (!isCancelled) {
          setLoading(false);
          if (timeout) window.clearTimeout(timeout);
        }
      } catch (err) {
        console.error("PowerPoint preview error:", err);
        if (!isCancelled) {
          setError(
            "Preview not available for this PowerPoint file. You can download it to view on your device."
          );
          setLoading(false);
          if (timeout) window.clearTimeout(timeout);
        }
      }
    };

    timeout = window.setTimeout(() => {
      if (!isCancelled && loading) {
        setError(
          "This presentation is taking longer than expected to load. Please download to view it."
        );
        setLoading(false);
      }
    }, 20000); // 20 second timeout

    load();

    return () => {
      isCancelled = true;
      if (viewer && typeof viewer.destroy === "function") {
        try {
          viewer.destroy();
        } catch (e) {
          console.error("Error destroying PowerPoint viewer:", e);
        }
      }
      if (timeout) {
        window.clearTimeout(timeout);
      }
    };
  }, [fileUrl]);

  return (
    <div className="relative w-full h-full bg-background">
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto"
        aria-label={`Preview of PowerPoint presentation ${title}`}
      />

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground font-medium">Loading presentation...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm">
          <div className="max-w-md text-center space-y-4 p-6 rounded-lg border border-border bg-card shadow-lg">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild size="sm">
              <a href={fileUrl} download>
                Download PowerPoint
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
