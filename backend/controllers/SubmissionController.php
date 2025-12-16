<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class SubmissionController {
    public static function index(): void {
        $uid = require_user();
        $isAdmin = verify_role($uid, 'admin') || verify_role($uid, 'accounts') || verify_role($uid, 'teacher');
        $pdo = get_pdo();
        $where = [];
        $params = [];
        $mine = ($_GET['mine'] ?? 'false') === 'true';

        // For non-admin users or explicit mine=true, return only their submissions
        if (!$isAdmin || $mine) {
            $where[] = 's.user_id = :uid';
            $params[':uid'] = $uid;
        }
        if (!empty($_GET['courseId'])) {
            $where[] = 'a.course = :course';
            $params[':course'] = $_GET['courseId'];
        }
        if (!empty($_GET['status'])) {
            $where[] = 's.status = :status';
            $params[':status'] = $_GET['status'];
        }

        $sql = 'SELECT s.*, a.title AS assignment_title, a.points, p.full_name, p.email FROM assignment_submissions s
                JOIN assignments a ON s.assignment_id = a.id
                LEFT JOIN profiles p ON s.user_id = p.id';
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY s.submitted_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        json_response($stmt->fetchAll());
    }

    public static function show(string $id): void {
        $uid = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path FROM assignment_submissions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $filePath = $stmt->fetchColumn();
        if (!$filePath) error_response('Not found', 404);
        // simple direct link; replace with signed URL handler if needed
        json_response(['url' => '/backend/storage/assignment-submissions/' . $filePath]);
    }

    public static function grade(string $id): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $marks = $input['marks_obtained'] ?? null;
        $feedback = $input['feedback'] ?? null;
        $status = $input['status'] ?? 'graded';
        $auto = !empty($input['auto']);
        if ($marks === null && !$auto) error_response('marks_obtained required unless auto=true', 400);

        if ($auto) {
            // Simple placeholder: set feedback and 0 marks if no AI key
            $apiKey = getenv('LOVABLE_API_KEY') ?: '';
            if (!$apiKey) {
                $marks = $marks ?? 0;
                $feedback = $feedback ?? 'Auto-grade unavailable (missing API key).';
            } else {
                // AI integration could be added here similarly to GuideController
                $marks = $marks ?? 0;
                $feedback = $feedback ?? 'Auto-grade processed.';
            }
        }

        $pdo = get_pdo();
        $pdo->prepare('UPDATE assignment_submissions SET marks_obtained = :marks, feedback = :fb, status = :status, graded_at = NOW(), graded_by = :by WHERE id = :id')
            ->execute([
                ':marks' => $marks,
                ':fb' => $feedback,
                ':status' => $status,
                ':by' => $uid,
                ':id' => $id
            ]);
        json_response(['graded' => true]);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path FROM assignment_submissions WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $filePath = $stmt->fetchColumn();
        $pdo->prepare('DELETE FROM assignment_submissions WHERE id = :id')->execute([':id' => $id]);
        if ($filePath) {
            $full = __DIR__ . '/../storage/assignment-submissions/' . $filePath;
            if (file_exists($full)) @unlink($full);
        }
        json_response(['deleted' => true]);
    }
}
