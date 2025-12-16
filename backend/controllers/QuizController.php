<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class QuizController {
    public static function index(): void {
        $userId = require_user();
        $targetUser = $_GET['user_id'] ?? $userId;
        if ($targetUser !== $userId) {
            admin_or_teacher_required($userId);
        }
        $pdo = get_pdo();
        $quizzes = $pdo->query('SELECT * FROM section_quizzes ORDER BY created_at DESC')->fetchAll();

        // attach per-user deadline if requested
        $deadlineStmt = $pdo->prepare('SELECT quiz_id, deadline FROM quiz_deadlines WHERE user_id = :uid');
        $deadlineStmt->execute([':uid' => $targetUser]);
        $dlMap = [];
        foreach ($deadlineStmt->fetchAll() as $row) {
            $dlMap[$row['quiz_id']] = $row['deadline'];
        }
        foreach ($quizzes as &$q) {
            $q['custom_deadline'] = $dlMap[$q['id']] ?? null;
        }

        json_response($quizzes);
    }

    public static function store(): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $required = ['course_id','section_id','title','quiz_url'];
        foreach ($required as $f) if (empty($input[$f])) error_response("Missing {$f}", 400);
        $id = self::uuid();
        get_pdo()->prepare('INSERT INTO section_quizzes (id, course_id, section_id, title, description, quiz_url, due_date, duration, is_hidden) VALUES (:id,:cid,:sid,:title,:desc,:url,:due,:dur,:hidden)')
            ->execute([
                ':id' => $id,
                ':cid' => $input['course_id'],
                ':sid' => $input['section_id'],
                ':title' => $input['title'],
                ':desc' => $input['description'] ?? null,
                ':url' => $input['quiz_url'],
                ':due' => $input['due_date'] ?? null,
                ':dur' => $input['duration'] ?? null,
                ':hidden' => !empty($input['is_hidden']) ? 1 : 0
            ]);
        json_response(['id' => $id], 201);
    }

    public static function update(string $id): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!$input) error_response('No fields', 400);
        $fields = [];
        $params = [':id' => $id];
        foreach ($input as $k => $v) {
            $fields[] = "{$k} = :{$k}";
            $params[":{$k}"] = $v;
        }
        $sql = 'UPDATE section_quizzes SET ' . implode(',', $fields) . ' WHERE id = :id';
        get_pdo()->prepare($sql)->execute($params);
        json_response(['updated' => true]);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        get_pdo()->prepare('DELETE FROM section_quizzes WHERE id = :id')->execute([':id' => $id]);
        json_response(['deleted' => true]);
    }

    public static function deadline(string $id): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $user = $input['user_id'] ?? null;
        $dl = $input['deadline'] ?? null;
        if (!$user || !$dl) error_response('user_id and deadline required', 400);
        get_pdo()->prepare('INSERT INTO quiz_deadlines (id, quiz_id, user_id, deadline) VALUES (:id,:qid,:uid,:dl) ON DUPLICATE KEY UPDATE deadline=VALUES(deadline)')
            ->execute([':id' => self::uuid(), ':qid' => $id, ':uid' => $user, ':dl' => $dl]);
        json_response(['saved' => true]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
