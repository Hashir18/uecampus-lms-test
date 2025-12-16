<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';

class ProgressController {
    public static function index(): void {
        $uid = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT * FROM progress_tracking WHERE user_id = :uid');
        $stmt->execute([':uid' => $uid]);
        json_response($stmt->fetchAll());
    }

    public static function summary(): void {
        $uid = require_user();
        $pdo = get_pdo();

        $enrollStmt = $pdo->prepare('SELECT COUNT(*) FROM enrollments WHERE user_id = :uid AND (status IS NULL OR status = "active")');
        $enrollStmt->execute([':uid' => $uid]);
        $activeCourses = (int)$enrollStmt->fetchColumn();

        $completedStmt = $pdo->prepare('SELECT COUNT(*) FROM progress_tracking WHERE user_id = :uid AND status = "completed"');
        $completedStmt->execute([':uid' => $uid]);
        $completedItems = (int)$completedStmt->fetchColumn();

        $avgStmt = $pdo->prepare('SELECT AVG(percentage) FROM progress_tracking WHERE user_id = :uid AND percentage IS NOT NULL');
        $avgStmt->execute([':uid' => $uid]);
        $avg = (float)$avgStmt->fetchColumn();

        $pointsStmt = $pdo->prepare('SELECT SUM(marks_obtained) FROM assignment_submissions WHERE user_id = :uid AND marks_obtained IS NOT NULL');
        $pointsStmt->execute([':uid' => $uid]);
        $points = (int)$pointsStmt->fetchColumn();

        json_response([
            'active_courses' => $activeCourses,
            'completed_items' => $completedItems,
            'average_progress' => round($avg, 2),
            'total_points' => $points,
        ]);
    }

    public static function upsert(): void {
        $uid = require_user();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $required = ['course_id','item_type','status'];
        foreach ($required as $f) if (empty($input[$f])) error_response("Missing {$f}", 400);
        $pdo = get_pdo();
        $id = $input['id'] ?? self::uuid();
        $pdo->prepare('INSERT INTO progress_tracking (id,user_id,course_id,item_type,assignment_id,quiz_id,status,score,max_score,percentage,completed_at) VALUES (:id,:uid,:cid,:type,:aid,:qid,:status,:score,:max,:pct,:completed) ON DUPLICATE KEY UPDATE status=VALUES(status),score=VALUES(score),max_score=VALUES(max_score),percentage=VALUES(percentage),completed_at=VALUES(completed_at)')
            ->execute([
                ':id' => $id,
                ':uid' => $uid,
                ':cid' => $input['course_id'],
                ':type' => $input['item_type'],
                ':aid' => $input['assignment_id'] ?? null,
                ':qid' => $input['quiz_id'] ?? null,
                ':status' => $input['status'],
                ':score' => $input['score'] ?? null,
                ':max' => $input['max_score'] ?? null,
                ':pct' => $input['percentage'] ?? null,
                ':completed' => $input['completed_at'] ?? date('Y-m-d H:i:s')
            ]);
        // Auto-generate certificate if course completed
        if ($input['item_type'] === 'course' && $input['status'] === 'completed' && ($input['percentage'] ?? 0) >= 100) {
            self::ensureCertificate($uid, $input['course_id']);
        }
        json_response(['id' => $id]);
    }

    private static function ensureCertificate(string $userId, string $courseId): void {
        $pdo = get_pdo();
        $exists = $pdo->prepare('SELECT id FROM certificates WHERE user_id = :uid AND course_id = :cid');
        $exists->execute([':uid' => $userId, ':cid' => $courseId]);
        if ($exists->fetchColumn()) return;
        $certId = self::uuid();
        $number = strtoupper(bin2hex(random_bytes(6)));
        $pdo->prepare('INSERT INTO certificates (id,user_id,course_id,certificate_number,issued_date,completion_date,generated_by) VALUES (:id,:uid,:cid,:num,NOW(),NOW(),:by)')
            ->execute([
                ':id' => $certId,
                ':uid' => $userId,
                ':cid' => $courseId,
                ':num' => $number,
                ':by' => $userId
            ]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
