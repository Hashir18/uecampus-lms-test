<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class DashboardController {
    public static function stats(): void {
        $uid = require_user();
        $pdo = get_pdo();

        // Allow targeting a specific user id (must be self unless privileged)
        $targetUserId = $_GET['user_id'] ?? $uid;

        // Admin/teacher/accounts roles can view aggregate stats for all courses.
        // Others see only their own courses. Admins can force personal stats with ?scope=personal
        $isPrivileged = verify_role($uid, 'admin') || verify_role($uid, 'teacher') || verify_role($uid, 'accounts');
        if ($targetUserId !== $uid && !$isPrivileged) {
            error_response('Forbidden', 403);
        }

        $scope = strtolower($_GET['scope'] ?? ($isPrivileged ? 'all' : 'personal'));
        if (!in_array($scope, ['all', 'personal'], true)) {
            $scope = $isPrivileged ? 'all' : 'personal';
        }

        if ($scope === 'all' && $isPrivileged) {
            // Global view for privileged users: summarize across all enrollments/courses
            $courseIds = $pdo->query('SELECT id FROM courses')->fetchAll(PDO::FETCH_COLUMN);
            $enrollments = $pdo->query('SELECT progress FROM enrollments WHERE status IS NULL OR status = "active"')->fetchAll(PDO::FETCH_ASSOC);
            $progressValues = array_map(function ($row) { return (int) ($row['progress'] ?? 0); }, $enrollments);
            $avgProgress = count($progressValues) ? (int) round(array_sum($progressValues) / count($progressValues)) : 0;
            $completed = 0;
            foreach ($enrollments as $row) {
                if ((int) ($row['progress'] ?? 0) >= 100) $completed++;
            }
            $inProgress = max(count($enrollments) - $completed, 0);

            json_response([
                'total_activity' => $avgProgress,
                'in_progress' => $inProgress,
                'completed' => $completed,
                'total_courses' => count($courseIds),
            ]);
        } else {
            // Personal view: stats are based on the learner's enrollments
            $courseStmt = $pdo->prepare('SELECT course_id, progress FROM enrollments WHERE user_id = :uid AND (status IS NULL OR status = "active")');
            $courseStmt->execute([':uid' => $targetUserId]);
            $enrollments = $courseStmt->fetchAll();
            if (!$enrollments) {
                json_response([
                    'total_activity' => 0,
                    'in_progress' => 0,
                    'completed' => 0,
                    'total_courses' => 0,
                ]);
            }

            $totalCourses = count($enrollments);
            $progressValues = [];
            $completedCourses = 0;
            foreach ($enrollments as $row) {
                $p = (int) ($row['progress'] ?? 0);
                $progressValues[] = $p;
                if ($p >= 100) $completedCourses++;
            }
            $avgProgress = count($progressValues) ? (int) round(array_sum($progressValues) / count($progressValues)) : 0;
            $inProgressCourses = max($totalCourses - $completedCourses, 0);

            json_response([
                'total_activity' => $avgProgress,
                'in_progress' => $inProgressCourses,
                'completed' => $completedCourses,
                'total_courses' => $totalCourses,
            ]);
        }
    }

    public static function update(): void {
        $uid = require_user();
        admin_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!$input) error_response('No fields', 400);
        $fields = [];
        $params = [];
        foreach ($input as $k => $v) {
            $fields[] = "{$k} = :{$k}";
            $params[":{$k}"] = $v;
        }
        get_pdo()->prepare('UPDATE dashboard_stats SET ' . implode(',', $fields) . ' LIMIT 1')->execute($params);
        json_response(['updated' => true]);
    }

    private static function fetchCount(PDO $pdo, string $sql, array $params = []): int {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return (int) $stmt->fetchColumn();
    }
}
