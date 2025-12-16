import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, BookOpen } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import CourseBooks from "@/components/CourseBooks";
import { apiFetch } from "@/lib/api";

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  tags: string[];
  downloads: number;
  created_at: string;
}

interface BookResult {
  id: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  thumbnail?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
  previewLink?: string;
  source: 'google' | 'openlibrary';
}

interface Course {
  id: string;
  title: string;
  category?: string | null;
  subcategory?: string | null;
}

const CATEGORIES = ["General", "Course Materials", "Assignments", "References", "Templates", "Other"];

export default function Library() {
  const { user } = useAuth();
  const { isAdmin } = useEditMode();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Book search state
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [books, setBooks] = useState<BookResult[]>([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  
  // Recommended books state
  const [recommendedBooks, setRecommendedBooks] = useState<BookResult[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecommendedBooks();
    }
  }, [user]);

  const loadRecommendedBooks = async () => {
    try {
      setLoadingRecommendations(true);
      const defaultTopics = ['Computer Science', 'Mathematics', 'Business', 'Engineering'];
      const courses = await apiFetch<Course[]>("/courses?enrolledOnly=true");

      let searchTerms: string[] = [];
      if (!courses || courses.length === 0) {
        searchTerms = defaultTopics;
      } else {
        const termsSet = new Set<string>();
        courses.forEach(course => {
          if (course.category) termsSet.add(course.category);
          if (course.subcategory) termsSet.add(course.subcategory);
          const titleWords = course.title.split(' ').slice(0, 3).join(' ');
          if (titleWords) termsSet.add(titleWords);
        });
        searchTerms = Array.from(termsSet).slice(0, 4);
        if (searchTerms.length === 0) searchTerms = defaultTopics;
      }

      const bookPromises = searchTerms.map(term =>
        apiFetch<{ books: BookResult[] }>("/library/search-books", {
          method: "POST",
          body: JSON.stringify({ query: term, maxResults: 3 }),
        })
      );

      const results = await Promise.all(bookPromises);
      
      // Combine books with round-robin to ensure variety
      const booksByTopic: BookResult[][] = [];
      const seenIds = new Set<string>();

      results.forEach(result => {
        const topicBooks: BookResult[] = [];
        (result.books || []).forEach((book: BookResult) => {
          if (!seenIds.has(book.id)) {
            seenIds.add(book.id);
            topicBooks.push(book);
          }
        });
        if (topicBooks.length > 0) {
          booksByTopic.push(topicBooks);
        }
      });

      // Round-robin distribution to ensure variety
      const mixedBooks: BookResult[] = [];
      let maxLength = Math.max(...booksByTopic.map(arr => arr.length));
      
      for (let i = 0; i < maxLength && mixedBooks.length < 12; i++) {
        for (let j = 0; j < booksByTopic.length && mixedBooks.length < 12; j++) {
          if (i < booksByTopic[j].length) {
            mixedBooks.push(booksByTopic[j][i]);
          }
        }
      }

      setRecommendedBooks(mixedBooks);
    } catch (error) {
      console.error('Error loading recommended books:', error);
      toast.error('Failed to load recommended books');
    } finally {
      setLoadingRecommendations(false);
    }
  };


  const handleBookClick = (book: BookResult) => {
    navigate(`/library/${book.id}`, { state: { book } });
  };

  const handleSearchBooks = async (query: string) => {
    if (!query.trim()) {
      setBooks([]);
      return;
    }

    try {
      setSearchingBooks(true);
      const data = await apiFetch<{ books: BookResult[] }>("/library/search-books", {
        method: "POST",
        body: JSON.stringify({ query, maxResults: 20 }),
      });

      setBooks(data.books || []);
      toast.success(`Found ${data.books?.length || 0} books`);
    } catch (error: any) {
      console.error('Error searching books:', error);
      toast.error('Failed to search books');
      setBooks([]);
    } finally {
      setSearchingBooks(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            eLibrary
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover educational books and resources
          </p>
        </div>
      </div>

      {/* Tabs for Recommended Books and Book Search */}
      <Tabs defaultValue="recommended" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-3">
          <TabsTrigger value="recommended">Recommended Books</TabsTrigger>
          <TabsTrigger value="search">Search Educational Books</TabsTrigger>
          <TabsTrigger value="course-books">Course Books</TabsTrigger>
        </TabsList>

        {/* Recommended Books Tab */}
        <TabsContent value="recommended" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Recommended for You</h2>
              <p className="text-sm text-muted-foreground">Based on your enrolled courses</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadRecommendedBooks}
              disabled={loadingRecommendations}
            >
              {loadingRecommendations ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {loadingRecommendations ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : recommendedBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedBooks.map((book) => (
                <Card 
                  key={book.id} 
                  className="border-border/50 hover:shadow-lg transition-all hover:scale-105 duration-300 overflow-hidden cursor-pointer"
                  onClick={() => handleBookClick(book)}
                >
                  <CardContent className="p-0">
                    {book.thumbnail && (
                      <div className="w-full h-48 bg-muted flex items-center justify-center overflow-hidden">
                        <img 
                          src={book.thumbnail} 
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{book.title}</h3>
                      
                      {book.authors.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          by {book.authors[0]}
                        </p>
                      )}

                      {book.categories && book.categories.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {book.categories[0]}
                        </Badge>
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
          ) : (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recommendations available</p>
              <p className="text-sm text-muted-foreground mt-2">Enroll in courses to get personalized book recommendations</p>
            </div>
          )}
        </TabsContent>

        {/* Educational Books Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for educational books (e.g., 'Python programming', 'Mathematics', 'History')..."
                value={bookSearchQuery}
                onChange={(e) => setBookSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchBooks(bookSearchQuery)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={() => handleSearchBooks(bookSearchQuery)}
              disabled={searchingBooks || !bookSearchQuery.trim()}
            >
              {searchingBooks ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchingBooks && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {!searchingBooks && books.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <Card 
                  key={book.id} 
                  className="border-border/50 hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                  onClick={() => handleBookClick(book)}
                >
                  <CardContent className="p-0">
                    {book.thumbnail && (
                      <div className="w-full h-48 bg-muted flex items-center justify-center overflow-hidden">
                        <img 
                          src={book.thumbnail} 
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{book.title}</h3>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {book.source === 'google' ? 'Google' : 'OpenLib'}
                        </Badge>
                      </div>
                      
                      {book.authors.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          by {book.authors.slice(0, 2).join(', ')}
                          {book.authors.length > 2 && ' et al.'}
                        </p>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {book.categories?.slice(0, 2).map((cat, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-primary pt-2">
                        <BookOpen className="h-3 w-3" />
                        <span>View Details</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!searchingBooks && books.length === 0 && bookSearchQuery && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No books found. Try a different search term.</p>
            </div>
          )}

          {!searchingBooks && books.length === 0 && !bookSearchQuery && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Search for educational books using Google Books and Open Library</p>
              <p className="text-sm text-muted-foreground mt-2">Try searching for topics like "Programming", "Mathematics", "Science", etc.</p>
            </div>
          )}
        </TabsContent>

        {/* Course Books Tab */}
        <TabsContent value="course-books">
          <CourseBooks isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
