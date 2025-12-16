import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Youtube, FileText, Clock, Eye, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: string;
  url: string;
}

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  coverImage?: string;
  url: string;
  publishedAt: string;
  tags: string[];
  readingTimeMinutes: number;
  user: {
    name: string;
    username: string;
  };
}

export default function GuideDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const video = location.state?.video as YouTubeVideo | undefined;
  const article = location.state?.article as DevToArticle | undefined;

  const [articleHtml, setArticleHtml] = useState<string>("");
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!article) return;

      try {
        setArticleLoading(true);
        setArticleError(null);

        const data = await apiFetch<{ body_html?: string }>("/guides/article", {
          method: "POST",
          body: JSON.stringify({ id: article.id }),
        });

        if (data?.body_html) setArticleHtml(data.body_html);
      } catch (err) {
        console.error("Error loading Dev.to article:", err);
        setArticleError("Unable to load article preview. Please open it on Dev.to.");
      } finally {
        setArticleLoading(false);
      }
    };

    fetchArticle();
  }, [article?.id]);
  if (!video && !article) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Guide not found</h1>
          <Button onClick={() => navigate("/guides")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Guides
          </Button>
        </div>
      </div>
    );
  }

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return "";
    const hours = (match[1] || "").replace("H", "");
    const minutes = (match[2] || "").replace("M", "");
    const seconds = (match[3] || "").replace("S", "");
    return `${hours ? hours + ":" : ""}${minutes || "0"}:${seconds.padStart(2, "0")}`;
  };

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (video) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/guides")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Guides
            </Button>

            <div className="flex items-center gap-2 mb-2">
              <Youtube className="h-6 w-6 text-red-500" />
              <Badge variant="secondary">Video Tutorial</Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">{video.title}</h1>
            <p className="text-lg text-muted-foreground">
              by {video.channelTitle}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-[300px,1fr] gap-8">
            {/* Left Column - Video Info */}
            <div className="space-y-6">
              {/* Thumbnail */}
              <div className="flex justify-center">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full rounded-lg shadow-xl"
                />
              </div>

              {/* Video Details */}
              <div className="space-y-4">
                {video.duration && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </h3>
                    <p className="text-base">{formatDuration(video.duration)}</p>
                  </div>
                )}

                {video.viewCount && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Views
                    </h3>
                    <p className="text-base">{formatViewCount(video.viewCount)}</p>
                  </div>
                )}

                {video.publishedAt && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Published
                    </h3>
                    <p className="text-base">{formatDate(video.publishedAt)}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => window.open(video.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Watch on YouTube
                </Button>
              </div>
            </div>

            {/* Right Column - Description and Preview */}
            <div className="space-y-8">
              {/* Description */}
              {video.description && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">About this video</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {video.description}
                  </p>
                </div>
              )}

              {/* Video Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Video Preview</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(video.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in YouTube
                  </Button>
                </div>
                <div className="w-full aspect-video border-2 border-border rounded-lg overflow-hidden bg-background">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}`}
                    className="w-full h-full"
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (article) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/guides")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Guides
            </Button>

            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-6 w-6 text-primary" />
              <Badge variant="secondary">Article</Badge>
            </div>
            <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
            <p className="text-lg text-muted-foreground">
              by {article.user.name} (@{article.user.username})
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-[300px,1fr] gap-8">
            {/* Left Column - Article Info */}
            <div className="space-y-6">
              {/* Cover Image */}
              {article.coverImage && (
                <div className="flex justify-center">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full rounded-lg shadow-xl"
                  />
                </div>
              )}

              {/* Article Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Reading Time
                  </h3>
                  <p className="text-base">{article.readingTimeMinutes} minutes</p>
                </div>

                {article.publishedAt && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Published
                    </h3>
                    <p className="text-base">{formatDate(article.publishedAt)}</p>
                  </div>
                )}

                {article.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => window.open(article.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Read on Dev.to
                </Button>
              </div>
            </div>

            {/* Right Column - Description and Preview */}
            <div className="space-y-8">
              {/* Description */}
              {article.description && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">About this article</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {article.description}
                  </p>
                </div>
              )}

              {/* Article Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Article Preview</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(article.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>

                <div className="w-full max-h-[800px] border-2 border-border rounded-lg overflow-auto bg-background">
                  {articleLoading && (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      Loading article preview...
                    </div>
                  )}

                  {!articleLoading && articleError && (
                    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        {articleError}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(article.url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open on Dev.to
                      </Button>
                    </div>
                  )}

                  {!articleLoading && !articleError && articleHtml && (
                    <article className="p-6 text-sm leading-relaxed space-y-4">
                      <div
                        className="space-y-4"
                        dangerouslySetInnerHTML={{ __html: articleHtml }}
                      />
                    </article>
                  )}

                  {!articleLoading && !articleError && !articleHtml && (
                    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm px-4 text-center">
                      Preview not available for this article. Please open it on Dev.to.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
