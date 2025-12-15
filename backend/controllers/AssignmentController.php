<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class AssignmentController {
    public static function index(): void {
        $userId = require_user();
        $pdo = get_pdo();
        $assignments = $pdo->query('SELECT * FROM assignments ORDER BY created_at DESC')->fetchAll();

        // attach per-user deadline if requested
        $deadlineStmt = $pdo->prepare('SELECT assignment_id, deadline FROM assignment_deadlines WHERE user_id = :uid');
        $deadlineStmt->execute([':uid' => $userId]);
        $dlMap = [];
        foreach ($deadlineStmt->fetchAll() as $row) {
            $dlMap[$row['assignment_id']] = $row['deadline'];
        }
        foreach ($assignments as &$a) {
            $a['custom_deadline'] = $dlMap[$a['id']] ?? null;
        }
        json_response($assignments);
    }

    public static function store(): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $required = ['title','course','course_code'];
        foreach ($required as $f) if (empty($input[$f])) error_response("Missing {$f}", 400);
        $id = self::uuid();
        $pdo = get_pdo();
        $pdo->prepare('INSERT INTO assignments (id,title,course,course_code,due_date,priority,hours_left,points,description,status,attempts) VALUES (:id,:title,:course,:code,:due,:priority,:hours,:points,:desc,:status,:attempts)')
            ->execute([
                ':id' => $id,
                ':title' => $input['title'],
                ':course' => $input['course'],
                ':code' => $input['course_code'],
                ':due' => $input['due_date'] ?? null,
                ':priority' => $input['priority'] ?? 'medium',
                ':hours' => $input['hours_left'] ?? null,
                ':points' => $input['points'] ?? 100,
                ':desc' => $input['description'] ?? null,
                ':status' => $input['status'] ?? 'pending',
                ':attempts' => $input['attempts'] ?? 2
            ]);
        json_response(['id' => $id], 201);
    }

    public static function update(string $id): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!$input) error_response('No fields', 400);
        $fields = [];
        $params = [':id' => $id];
        foreach ($input as $k => $v) {
            $fields[] = "{$k} = :{$k}";
            $params[":{$k}"] = $v;
        }
        $sql = 'UPDATE assignments SET ' . implode(',', $fields) . ' WHERE id = :id';
        get_pdo()->prepare($sql)->execute($params);
        json_response(['updated' => true]);
    }

    public static function destroy(string $id): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        get_pdo()->prepare('DELETE FROM assignments WHERE id = :id')->execute([':id' => $id]);
        json_response(['deleted' => true]);
    }

    public static function submit(string $id): void {
        $userId = require_user();
        if (empty($_FILES['file'])) error_response('No file uploaded', 400);
        $file = $_FILES['file'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = "{$userId}/{$id}/" . time() . '.' . $ext;
        $destDir = __DIR__ . "/../storage/assignment-submissions/" . dirname($fileName);
        if (!is_dir($destDir)) mkdir($destDir, 0775, true);
        $destPath = __DIR__ . "/../storage/assignment-submissions/{$fileName}";
        if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Store failed', 500);

        $pdo = get_pdo();
        $subId = self::uuid();
        $pdo->prepare('INSERT INTO assignment_submissions (id, assignment_id, user_id, file_path, status, submitted_at) VALUES (:id,:aid,:uid,:path,:status, NOW())')
            ->execute([
                ':id' => $subId,
                ':aid' => $id,
                ':uid' => $userId,
                ':path' => $fileName,
                ':status' => 'submitted'
            ]);
        $courseId = $_POST['course_id'] ?? null;
        if ($courseId) {
            $pdo->prepare('INSERT INTO progress_tracking (id,user_id,course_id,assignment_id,item_type,status,completed_at) VALUES (:id,:uid,:cid,:aid,:type,:status,NOW()) ON DUPLICATE KEY UPDATE status=VALUES(status),completed_at=VALUES(completed_at)')
            ->execute([
                ':id' => self::uuid(),
                ':uid' => $userId,
                ':cid' => $courseId,
                ':aid' => $id,
                ':type' => 'assignment',
                ':status' => 'completed'
            ]);
        }
        json_response(['submission_id' => $subId, 'file_path' => $fileName], 201);
    }

    public static function deadline(string $id): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $targetUser = $input['user_id'] ?? null;
        $deadline = $input['deadline'] ?? null;
        if (!$targetUser || !$deadline) error_response('user_id and deadline required', 400);
        $pdo = get_pdo();
        $pdo->prepare('INSERT INTO assignment_deadlines (id, assignment_id, user_id, deadline) VALUES (:id,:aid,:uid,:dl) ON DUPLICATE KEY UPDATE deadline = VALUES(deadline)')
            ->execute([
                ':id' => self::uuid(),
                ':aid' => $id,
                ':uid' => $targetUser,
                ':dl' => $deadline
            ]);
        json_response(['saved' => true]);
    }

    public static function extraAttempts(string $id): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $targetUser = $input['user_id'] ?? null;
        $attempts = $input['extra_attempts'] ?? null;
        if (!$targetUser || $attempts === null) error_response('user_id and extra_attempts required', 400);
        $pdo = get_pdo();
        $pdo->prepare('INSERT INTO assignment_extra_attempts (id, assignment_id, user_id, extra_attempts, granted_by) VALUES (:id,:aid,:uid,:attempts,:by) ON DUPLICATE KEY UPDATE extra_attempts = VALUES(extra_attempts), granted_by = VALUES(granted_by), granted_at = NOW()')
            ->execute([
                ':id' => self::uuid(),
                ':aid' => $id,
                ':uid' => $targetUser,
                ':attempts' => (int)$attempts,
                ':by' => $userId
            ]);
        json_response(['saved' => true]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
