<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';

class GuideController {
    public static function search(): void {
        require_user();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $query = trim($input['query'] ?? '');
        $max = max(1, min((int)($input['maxResults'] ?? 12), 25));
        if ($query === '') error_response('query required', 400);

        $youtube = [];
        $devto = [];

        $ytKey = getenv('YOUTUBE_API_KEY') ?: '';
        if ($ytKey) {
            $url = "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" . urlencode($query) . "&type=video&maxResults={$max}&order=relevance&key={$ytKey}";
            $res = @file_get_contents($url);
            if ($res !== false) {
                $data = json_decode($res, true);
                foreach ($data['items'] ?? [] as $item) {
                    $ytId = $item['id']['videoId'] ?? '';
                    $snippet = $item['snippet'] ?? [];
                    $youtube[] = [
                        'id' => $ytId,
                        'title' => $snippet['title'] ?? '',
                        'description' => $snippet['description'] ?? '',
                        'thumbnail' => $snippet['thumbnails']['high']['url'] ?? null,
                        'channelTitle' => $snippet['channelTitle'] ?? '',
                        'publishedAt' => $snippet['publishedAt'] ?? '',
                        'url' => $ytId ? "https://www.youtube.com/watch?v={$ytId}" : null,
                    ];
                }
            }
        }

        $devUrl = "https://dev.to/api/articles?tag=" . urlencode(strtolower(str_replace(' ', '', $query))) . "&per_page={$max}";
        $devRes = @file_get_contents($devUrl);
        if ($devRes !== false) {
            $data = json_decode($devRes, true);
            foreach ($data ?? [] as $article) {
                $devto[] = [
                    'id' => $article['id'] ?? null,
                    'title' => $article['title'] ?? '',
                    'description' => $article['description'] ?? '',
                    'coverImage' => $article['cover_image'] ?? $article['social_image'] ?? null,
                    'url' => $article['url'] ?? '',
                    'publishedAt' => $article['published_at'] ?? '',
                    'tags' => $article['tag_list'] ?? [],
                    'readingTimeMinutes' => $article['reading_time_minutes'] ?? 5,
                    'user' => [
                        'name' => $article['user']['name'] ?? 'Unknown',
                        'username' => $article['user']['username'] ?? '',
                    ],
                ];
            }
        }

        json_response(['youtube' => $youtube, 'devto' => $devto, 'total' => count($youtube) + count($devto)]);
    }

    public static function article(): void {
        require_user();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $input['id'] ?? null;
        if (!$id) error_response('id required', 400);
        $url = "https://dev.to/api/articles/{$id}";
        $res = @file_get_contents($url);
        if ($res === false) {
            error_response('Failed to fetch article', 502);
        }
        $article = json_decode($res, true);
        json_response([
            'id' => $article['id'] ?? $id,
            'title' => $article['title'] ?? '',
            'description' => $article['description'] ?? '',
            'url' => $article['url'] ?? '',
            'body_html' => $article['body_html'] ?? '',
            'published_at' => $article['published_at'] ?? '',
            'tags' => $article['tag_list'] ?? [],
            'reading_time_minutes' => $article['reading_time_minutes'] ?? 5,
            'user' => [
                'name' => $article['user']['name'] ?? 'Unknown',
                'username' => $article['user']['username'] ?? '',
            ],
        ]);
    }

    public static function studyGuide(): void {
        require_user();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $topic = $input['topic'] ?? '';
        $difficulty = $input['difficulty'] ?? 'intermediate';
        $includeExamples = !empty($input['includeExamples']);
        if (!$topic) error_response('topic required', 400);

        $apiKey = getenv('LOVABLE_API_KEY') ?: '';
        if (!$apiKey) {
            json_response([
                'topic' => $topic,
                'studyGuide' => "Study guide for {$topic} (difficulty: {$difficulty}). Add LOVABLE_API_KEY to enable AI generation.",
                'generatedAt' => date(DATE_ATOM)
            ]);
            return;
        }

        $body = [
            'model' => 'google/gemini-2.5-flash',
            'messages' => [
                ['role' => 'system', 'content' => 'You are an expert educational content creator.'],
                ['role' => 'user', 'content' => "Create a detailed study guide for {$topic}. Difficulty: {$difficulty}. " . ($includeExamples ? 'Include practical examples and exercises.' : 'Focus on theory.')]
            ],
        ];

        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\nAuthorization: Bearer {$apiKey}\r\n",
                'content' => json_encode($body),
                'timeout' => 10
            ]
        ];
        $ctx = stream_context_create($opts);
        $res = @file_get_contents('https://ai.gateway.lovable.dev/v1/chat/completions', false, $ctx);
        if ($res === false) {
            json_response([
                'topic' => $topic,
                'studyGuide' => "AI request failed; please try again later.",
                'generatedAt' => date(DATE_ATOM)
            ], 502);
            return;
        }
        $data = json_decode($res, true);
        $content = $data['choices'][0]['message']['content'] ?? 'No content';
        json_response([
            'topic' => $topic,
            'studyGuide' => $content,
            'generatedAt' => date(DATE_ATOM)
        ]);
    }
}
