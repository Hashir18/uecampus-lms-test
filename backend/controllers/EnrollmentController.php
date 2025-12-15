<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class EnrollmentController {
    public static function mine(): void {
        $uid = require_user();
        $stmt = get_pdo()->prepare('SELECT * FROM enrollments WHERE user_id = :uid');
        $stmt->execute([':uid' => $uid]);
        json_response($stmt->fetchAll());
    }

    public static function enroll(): void {
        $uid = require_user();
        admin_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $userId = $input['user_id'] ?? '';
        $courseId = $input['course_id'] ?? '';
        if (!$userId || !$courseId) error_response('user_id and course_id required', 400);
        $id = self::uuid();
        get_pdo()->prepare('INSERT INTO enrollments (id,user_id,course_id,status,role,enrolled_at,enrolled_by) VALUES (:id,:uid,:cid,:status,:role,NOW(),:by)')
            ->execute([
                ':id' => $id,
                ':uid' => $userId,
                ':cid' => $courseId,
                ':status' => $input['status'] ?? 'active',
                ':role' => $input['role'] ?? 'student',
                ':by' => $uid
            ]);
        json_response(['id' => $id], 201);
    }

    public static function unenroll(string $id): void {
        $uid = require_user();
        admin_required($uid);
        get_pdo()->prepare('DELETE FROM enrollments WHERE id = :id')->execute([':id' => $id]);
        json_response(['deleted' => true]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
