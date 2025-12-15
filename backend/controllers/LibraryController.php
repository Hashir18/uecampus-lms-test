<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';

class LibraryController {
    public static function searchBooks(): void {
        require_user();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $query = trim($input['query'] ?? '');
        $max = max(1, min((int)($input['maxResults'] ?? 20), 40));
        if ($query === '') error_response('query required', 400);

        $books = [];

        // Google Books
        $googleKey = getenv('GOOGLE_BOOKS_API_KEY') ?: '';
        if ($googleKey) {
            $url = 'https://www.googleapis.com/books/v1/volumes?q=' . urlencode($query) . '&maxResults=' . $max . '&orderBy=relevance&printType=books&key=' . $googleKey;
            $res = @file_get_contents($url);
            if ($res !== false) {
                $data = json_decode($res, true);
                foreach ($data['items'] ?? [] as $item) {
                    $info = $item['volumeInfo'] ?? [];
                    $books[] = [
                        'id' => 'google-' . ($item['id'] ?? ''),
                        'title' => $info['title'] ?? 'Untitled',
                        'authors' => $info['authors'] ?? [],
                        'publisher' => $info['publisher'] ?? null,
                        'publishedDate' => $info['publishedDate'] ?? null,
                        'description' => $info['description'] ?? null,
                        'thumbnail' => $info['imageLinks']['thumbnail'] ?? null,
                        'categories' => $info['categories'] ?? [],
                        'pageCount' => $info['pageCount'] ?? null,
                        'language' => $info['language'] ?? null,
                        'previewLink' => $info['previewLink'] ?? null,
                        'source' => 'google',
                    ];
                }
            }
        }

        // Open Library (no key)
        $olUrl = 'https://openlibrary.org/search.json?q=' . urlencode($query) . '&limit=' . $max;
        $olRes = @file_get_contents($olUrl);
        if ($olRes !== false) {
            $data = json_decode($olRes, true);
            foreach ($data['docs'] ?? [] as $doc) {
                $coverId = $doc['cover_i'] ?? null;
                $books[] = [
                    'id' => 'openlibrary-' . ($doc['key'] ?? ''),
                    'title' => $doc['title'] ?? 'Untitled',
                    'authors' => $doc['author_name'] ?? [],
                    'publisher' => $doc['publisher'][0] ?? null,
                    'publishedDate' => isset($doc['first_publish_year']) ? (string)$doc['first_publish_year'] : null,
                    'description' => $doc['first_sentence'][0] ?? null,
                    'thumbnail' => $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-M.jpg" : null,
                    'categories' => array_slice($doc['subject'] ?? [], 0, 5),
                    'pageCount' => $doc['number_of_pages_median'] ?? null,
                    'language' => $doc['language'][0] ?? null,
                    'previewLink' => isset($doc['key']) ? "https://openlibrary.org{$doc['key']}" : null,
                    'source' => 'openlibrary',
                ];
            }
        }

        json_response(['books' => $books, 'total' => count($books)]);
    }
}
