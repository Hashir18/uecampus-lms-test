<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class CourseController {
    public static function index(): void {
        $userId = self::maybeUserId(); // optional; allows public access
        $pdo = get_pdo();
        $isAdmin = $userId ? verify_role($userId, 'admin') : false;
        $isAccounts = $userId ? verify_role($userId, 'accounts') : false;
        $isPrivileged = $isAdmin || $isAccounts;
        $onlyMineParam = ($_GET['enrolledOnly'] ?? 'false') === 'true';

        // Non-admins see only enrolled courses by default
        if (!$isPrivileged || ($onlyMineParam && $userId)) {
            if (!$userId) {
                json_response([]); // unauthenticated non-admin: no courses
                return;
            }
            $stmt = $pdo->prepare('SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = :uid');
            $stmt->execute([':uid' => $userId]);
            json_response($stmt->fetchAll());
            return;
        }

        $search = trim($_GET['search'] ?? '');
        if ($search !== '') {
            $stmt = $pdo->prepare('SELECT * FROM courses WHERE title LIKE :q OR description LIKE :q ORDER BY created_at DESC');
            $stmt->execute([':q' => "%{$search}%"]);
            json_response($stmt->fetchAll());
            return;
        }

        // Default: privileged users see all courses
        $stmt = $pdo->query('SELECT * FROM courses ORDER BY created_at DESC');
        json_response($stmt->fetchAll());
    }

    public static function show(string $id): void {
        $userId = self::maybeUserId(); // optional; allows public access
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT * FROM courses WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $course = $stmt->fetch();
        if (!$course) error_response('Not found', 404);

        $sections = $pdo->prepare('SELECT * FROM course_sections WHERE course_id = :id ORDER BY order_index');
        $sections->execute([':id' => $id]);
        $course['sections'] = $sections->fetchAll();

        $materials = $pdo->prepare('SELECT * FROM course_materials WHERE course_id = :id ORDER BY order_index');
        $materials->execute([':id' => $id]);
        $course['materials'] = $materials->fetchAll();

        $assignments = $pdo->prepare('SELECT * FROM assignments WHERE course = :id');
        $assignments->execute([':id' => $id]);
        $course['assignments'] = $assignments->fetchAll();

        $quizzes = $pdo->prepare('SELECT * FROM section_quizzes WHERE course_id = :id');
        $quizzes->execute([':id' => $id]);
        $course['quizzes'] = $quizzes->fetchAll();

        // Only admins see enrollment roster to avoid leaking user data publicly
        if ($userId && verify_role($userId, 'admin')) {
            $enrollments = $pdo->prepare('SELECT e.*, p.full_name, p.email FROM enrollments e LEFT JOIN profiles p ON e.user_id = p.id WHERE e.course_id = :id');
            $enrollments->execute([':id' => $id]);
            $course['enrollments'] = $enrollments->fetchAll();
        } else {
            $course['enrollments'] = [];
        }

        json_response($course);
    }

    /**
     * Best-effort user detection that never blocks public access.
     * Returns null if no/invalid/expired token is provided.
     */
    private static function maybeUserId(): ?string {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if (!$auth) {
            $headers = function_exists('getallheaders') ? getallheaders() : [];
            if (!empty($headers['Authorization'])) {
                $auth = $headers['Authorization'];
            } elseif (!empty($headers['authorization'])) {
                $auth = $headers['authorization'];
            }
        }
        if (!$auth && !empty($_GET['token'])) {
            $auth = 'Bearer ' . $_GET['token'];
        }
        if (stripos($auth, 'Bearer ') !== 0) {
            return null;
        }

        $token = trim(substr($auth, 7));
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$headerB64, $payloadB64, $sigB64] = $parts;

        $payload = json_decode(base64url_decode($payloadB64), true);
        $signature = base64url_decode($sigB64);

        $valid = false;
        foreach (jwt_all_secrets() as $secret) {
            $expected = hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true);
            if (hash_equals($expected, $signature)) {
                $valid = true;
                break;
            }
        }
        if (!$valid) return null;
        if (($payload['exp'] ?? 0) < time()) return null;
        return $payload['sub'] ?? null;
    }

    public static function store(): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $required = ['title','code','category','duration'];
        foreach ($required as $field) {
            if (empty($input[$field])) error_response("Missing {$field}", 400);
        }
        $id = self::uuid();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('INSERT INTO courses (id, code, title, category, duration, description, status) VALUES (:id,:code,:title,:category,:duration,:description,:status)');
        $stmt->execute([
            ':id' => $id,
            ':code' => $input['code'],
            ':title' => $input['title'],
            ':category' => $input['category'],
            ':duration' => $input['duration'],
            ':description' => $input['description'] ?? null,
            ':status' => 'active'
        ]);
        json_response(['id' => $id], 201);
    }

    public static function update(string $id): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!$input) json_response(['updated' => false], 400);
        $fields = [];
        $params = [':id' => $id];
        foreach ($input as $k => $v) {
            $fields[] = "{$k} = :{$k}";
            $params[":{$k}"] = $v;
        }
        $sql = 'UPDATE courses SET ' . implode(',', $fields) . ' WHERE id = :id';
        get_pdo()->prepare($sql)->execute($params);
        json_response(['updated' => true]);
    }

    public static function destroy(string $id): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        get_pdo()->prepare('DELETE FROM courses WHERE id = :id')->execute([':id' => $id]);
        json_response(['deleted' => true]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
