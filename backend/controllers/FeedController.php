<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';

class FeedController {
    public static function upcoming(): void {
        $uid = require_user();
        $pdo = get_pdo();
        // Assignments with deadlines (base + custom)
        $assignments = $pdo->prepare('
            SELECT a.id, a.title, a.course, a.due_date, ad.deadline AS custom_deadline
            FROM assignments a
            LEFT JOIN assignment_deadlines ad ON ad.assignment_id = a.id AND ad.user_id = :uid
            WHERE a.due_date IS NOT NULL
            ORDER BY COALESCE(ad.deadline, a.due_date) ASC
            LIMIT 20
        ');
        $assignments->execute([':uid' => $uid]);
        $quizzes = $pdo->prepare('
            SELECT q.id, q.title, q.course_id, q.due_date, qd.deadline AS custom_deadline
            FROM section_quizzes q
            LEFT JOIN quiz_deadlines qd ON qd.quiz_id = q.id AND qd.user_id = :uid
            WHERE q.due_date IS NOT NULL
            ORDER BY COALESCE(qd.deadline, q.due_date) ASC
            LIMIT 20
        ');
        $quizzes->execute([':uid' => $uid]);
        json_response([
            'assignments' => $assignments->fetchAll(),
            'quizzes' => $quizzes->fetchAll(),
        ]);
    }

    public static function today(): void {
        $uid = require_user();
        $pdo = get_pdo();
        $today = date('Y-m-d');
        $stmt = $pdo->prepare('SELECT * FROM progress_tracking WHERE user_id = :uid AND DATE(completed_at) = :today');
        $stmt->execute([':uid' => $uid, ':today' => $today]);
        json_response($stmt->fetchAll());
    }
}
