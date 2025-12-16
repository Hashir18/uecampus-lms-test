import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Youtube, FileText, Clock, Eye, Loader2, BookOpen, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import CourseGuides from "@/components/CourseGuides";
import LMSGuides from "@/components/LMSGuides";
import { useEditMode } from "@/contexts/EditModeContext";
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

interface GuidesData {
  youtube: YouTubeVideo[];
  devto: DevToArticle[];
  total: number;
}

export default function Guides() {
  const navigate = useNavigate();
  const { isAdmin } = useEditMode();
  const [query, setQuery] = useState("");
  const [guides, setGuides] = useState<GuidesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedGuides, setRecommendedGuides] = useState<GuidesData | null>(null);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const { toast } = useToast();

  // Study Guide Generation State
  const [studyGuideTopic, setStudyGuideTopic] = useState("");
  const [studyGuideDifficulty, setStudyGuideDifficulty] = useState("intermediate");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [generatedGuide, setGeneratedGuide] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadRecommendedGuides();
  }, []);

  const loadRecommendedGuides = async () => {
    try {
      setLoadingRecommended(true);
      // Load popular programming topics
      const topics = ['React', 'JavaScript', 'Python', 'Web Development'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      
      const data = await apiFetch<GuidesData>("/guides/search", {
        method: "POST",
        body: JSON.stringify({ query: randomTopic, maxResults: 8 }),
      });

      setRecommendedGuides(data);
    } catch (error) {
      console.error("Error loading recommended guides:", error);
    } finally {
      setLoadingRecommended(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiFetch<GuidesData>("/guides/search", {
        method: "POST",
        body: JSON.stringify({ query: query.trim(), maxResults: 12 }),
      });

      setGuides(data);
      toast({
        title: "Success",
        description: `Found ${data.total} learning resources`,
      });
    } catch (error) {
      console.error("Error fetching guides:", error);
      toast({
        title: "Error",
        description: "Failed to fetch learning guides. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoClick = (video: YouTubeVideo) => {
    navigate(`/guides/video/${video.id}`, { state: { video } });
  };

  const handleArticleClick = (article: DevToArticle) => {
    navigate(`/guides/article/${article.id}`, { state: { article } });
  };

  const handleGenerateStudyGuide = async () => {
    if (!studyGuideTopic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic for the study guide",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedGuide(null);
    try {
      const data = await apiFetch<{ studyGuide: string }>("/guides/study-guide", {
        method: "POST",
        body: JSON.stringify({
          topic: studyGuideTopic.trim(),
          difficulty: studyGuideDifficulty,
          includeExamples,
        }),
      });

      setGeneratedGuide(data.studyGuide);
      toast({
        title: "Success",
        description: "Study guide generated successfully!",
      });
    } catch (error) {
      console.error("Error generating study guide:", error);
      toast({
        title: "Error",
        description: "Failed to generate study guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Learning Guides
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover educational videos and programming tutorials
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch}>
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for tutorials, courses, or topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>
      </form>

      <Tabs defaultValue="recommended" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="lms-guides">LMS Guides</TabsTrigger>
          <TabsTrigger value="study-guide" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Study Guide
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="devto" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Articles
          </TabsTrigger>
        </TabsList>

        {/* AI Study Guide Generator Tab */}
        <TabsContent value="study-guide" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    AI-Powered Study Guide Generator
                  </h2>
                  <p className="text-muted-foreground">
                    Generate custom study guides tailored to your learning needs using AI
                  </p>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Topic</label>
                    <Input
                      placeholder="e.g., React Hooks, Python Data Structures, Machine Learning..."
                      value={studyGuideTopic}
                      onChange={(e) => setStudyGuideTopic(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
                      <Select
                        value={studyGuideDifficulty}
                        onValueChange={setStudyGuideDifficulty}
                        disabled={isGenerating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 mt-8">
                      <Checkbox
                        id="examples"
                        checked={includeExamples}
                        onCheckedChange={(checked) => setIncludeExamples(checked as boolean)}
                        disabled={isGenerating}
                      />
                      <label htmlFor="examples" className="text-sm font-medium">
                        Include practical examples & exercises
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateStudyGuide}
                    disabled={isGenerating || !studyGuideTopic.trim()}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Study Guide...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Study Guide
                      </>
                    )}
                  </Button>
                </div>

                {generatedGuide && (
                  <div className="mt-6 p-6 border border-border rounded-lg bg-muted/50">
                    <h3 className="text-xl font-bold mb-4">Your Study Guide</h3>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
                      {generatedGuide}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LMS Guides Tab */}
        <TabsContent value="lms-guides" className="mt-6">
          <LMSGuides isAdmin={isAdmin} />
        </TabsContent>

        {/* Recommended Guides Tab */}
        <TabsContent value="recommended" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Popular Learning Resources</h2>
              <p className="text-sm text-muted-foreground">Curated guides to get you started</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadRecommendedGuides}
              disabled={loadingRecommended}
            >
              {loadingRecommended ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {loadingRecommended ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : recommendedGuides ? (
            <>
              {recommendedGuides.youtube.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-500" />
                    Video Tutorials
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendedGuides.youtube.slice(0, 4).map((video) => (
                      <Card 
                        key={video.id} 
                        className="border-border/50 hover:shadow-lg transition-all hover:scale-105 duration-300 overflow-hidden cursor-pointer"
                        onClick={() => handleVideoClick(video)}
                      >
                        <CardContent className="p-0">
                          <div className="relative w-full h-48 bg-muted">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                            {video.duration && (
                              <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                                {formatDuration(video.duration)}
                              </Badge>
                            )}
                          </div>
                          <div className="p-4 space-y-2">
                            <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {video.channelTitle}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatViewCount(video.viewCount || "0")}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-primary pt-1">
                              <BookOpen className="h-3 w-3" />
                              <span>View Details</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {recommendedGuides.devto.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Programming Articles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendedGuides.devto.slice(0, 4).map((article) => (
                      <Card 
                        key={article.id} 
                        className="border-border/50 hover:shadow-lg transition-all hover:scale-105 duration-300 overflow-hidden cursor-pointer"
                        onClick={() => handleArticleClick(article)}
                      >
                        <CardContent className="p-0">
                          {article.coverImage ? (
                            <div className="w-full h-48 bg-muted">
                              <img
                                src={article.coverImage}
                                alt={article.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-48 bg-muted flex items-center justify-center">
                              <FileText className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="p-4 space-y-2">
                            <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              by {article.user.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {article.readingTimeMinutes} min read
                            </div>
                            {article.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {article.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-primary pt-1">
                              <BookOpen className="h-3 w-3" />
                              <span>View Details</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recommendations available</p>
            </div>
          )}
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="youtube" className="mt-6">
          {loadingRecommended ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : recommendedGuides && recommendedGuides.youtube.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Popular video tutorials to help you learn
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendedGuides.youtube.map((video) => (
                  <Card 
                    key={video.id} 
                    className="border-border/50 hover:shadow-lg transition-all hover:scale-105 duration-300 overflow-hidden cursor-pointer"
                    onClick={() => handleVideoClick(video)}
                  >
                    <CardContent className="p-0">
                      <div className="relative w-full h-48 bg-muted">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        {video.duration && (
                          <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                            {formatDuration(video.duration)}
                          </Badge>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {video.channelTitle}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatViewCount(video.viewCount || "0")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary pt-1">
                          <BookOpen className="h-3 w-3" />
                          <span>View Details</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No videos available</p>
            </div>
          )}
        </TabsContent>

        {/* Articles Tab */}
        <TabsContent value="devto" className="mt-6">
          {loadingRecommended ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : recommendedGuides && recommendedGuides.devto.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Programming articles and tutorials from Dev.to
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendedGuides.devto.map((article) => (
                  <Card 
                    key={article.id} 
                    className="border-border/50 hover:shadow-lg transition-all hover:scale-105 duration-300 overflow-hidden cursor-pointer"
                    onClick={() => handleArticleClick(article)}
                  >
                    <CardContent className="p-0">
                      {article.coverImage ? (
                        <div className="w-full h-48 bg-muted">
                          <img
                            src={article.coverImage}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-muted flex items-center justify-center">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          by {article.user.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {article.readingTimeMinutes} min read
                        </div>
                        {article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {article.tags.slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-primary pt-1">
                          <BookOpen className="h-3 w-3" />
                          <span>View Details</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No articles available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Search Results - Separate Section */}
      {guides && (
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <p className="text-sm text-muted-foreground">
              Found {guides.total} resources for "{query}"
            </p>
          </div>
          
          <Tabs defaultValue="youtube" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Videos ({guides.youtube.length})
              </TabsTrigger>
              <TabsTrigger value="devto" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Articles ({guides.devto.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="youtube" className="mt-6">
               {guides.youtube.length === 0 ? (
                <div className="text-center py-12">
                  <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No videos found for this topic</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {guides.youtube.map((video) => (
                    <Card 
                      key={video.id} 
                      className="border-border/50 hover:shadow-lg transition-all hover:scale-105 duration-300 overflow-hidden cursor-pointer"
                      onClick={() => handleVideoClick(video)}
                    >
                      <CardContent className="p-0">
                        <div className="relative w-full h-48 bg-muted">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          {video.duration && (
                            <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                              {formatDuration(video.duration)}
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {video.channelTitle}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatViewCount(video.viewCount || "0")}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-primary pt-1">
                            <BookOpen className="h-3 w-3" />
                            <span>View Details</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="devto" className="mt-6">
              {guides.devto.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No articles found for this topic</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {guides.devto.map((article) => (
                    <Card 
                      key={article.id} 
                      className="border-border/50 hover:shadow-lg transition-all hover:scale-105 duration-300 overflow-hidden cursor-pointer"
                      onClick={() => handleArticleClick(article)}
                    >
                      <CardContent className="p-0">
                        {article.coverImage ? (
                          <div className="w-full h-48 bg-muted">
                            <img
                              src={article.coverImage}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-muted flex items-center justify-center">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold text-sm line-clamp-2">{article.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            by {article.user.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {article.readingTimeMinutes} min read
                          </div>
                          {article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {article.tags.slice(0, 2).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-primary pt-1">
                            <BookOpen className="h-3 w-3" />
                            <span>View Details</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {guides && guides.total === 0 && (
        <div className="text-center py-12 mt-6">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No results found. Try a different search term.</p>
        </div>
      )}
    </div>
  );
}
