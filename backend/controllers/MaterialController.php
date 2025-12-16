<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class MaterialController {
    public static function upload(): void {
        $userId = require_user();
        admin_or_teacher_required($userId);

        $courseId = $_POST['course_id'] ?? '';
        $sectionId = $_POST['section_id'] ?? null;
        $title = $_POST['title'] ?? ($_FILES['file']['name'] ?? 'File');
        $orderIndex = (int)($_POST['order_index'] ?? 0);
        if (!$courseId) error_response('course_id required', 400);

        $pdo = get_pdo();
        $id = self::uuid();

        // Link-only material (e.g., Google Drive / external video)
        $linkUrl = trim($_POST['link_url'] ?? '');
        if (!$linkUrl && empty($_FILES['file'])) {
            error_response('No file or link provided', 400);
        }

        if ($linkUrl && empty($_FILES['file'])) {
            $fileType = $_POST['file_type'] ?? 'google_drive';
            $pdo->prepare('INSERT INTO course_materials (id, course_id, section_id, title, file_path, file_type, file_size, order_index) VALUES (:id,:cid,:sid,:title,:path,:type,:size,:ord)')
                ->execute([
                    ':id' => $id,
                    ':cid' => $courseId,
                    ':sid' => $sectionId,
                    ':title' => $title,
                    ':path' => $linkUrl,
                    ':type' => $fileType,
                    ':size' => 0,
                    ':ord' => $orderIndex
                ]);
            json_response(['id' => $id, 'file_path' => $linkUrl]);
            return;
        }

        // File upload path
        if (empty($_FILES['file'])) {
            error_response('No file uploaded', 400);
        }

        $file = $_FILES['file'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = "{$courseId}/" . ($sectionId ?: 'root') . "/" . time() . '-' . bin2hex(random_bytes(4)) . ".{$ext}";
        $destDir = __DIR__ . "/../storage/course-materials/" . dirname($fileName);
        if (!is_dir($destDir)) {
            mkdir($destDir, 0775, true);
        }
        $destPath = __DIR__ . "/../storage/course-materials/{$fileName}";
        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            error_response('Failed to store file', 500);
        }

        $pdo->prepare('INSERT INTO course_materials (id, course_id, section_id, title, file_path, file_type, file_size, order_index) VALUES (:id,:cid,:sid,:title,:path,:type,:size,:ord)')
            ->execute([
                ':id' => $id,
                ':cid' => $courseId,
                ':sid' => $sectionId,
                ':title' => $title,
                ':path' => $fileName,
                ':type' => $file['type'],
                ':size' => $file['size'],
                ':ord' => $orderIndex
            ]);

        json_response(['id' => $id, 'file_path' => $fileName]);
    }

    public static function signedUrl(string $id): void {
        require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path FROM course_materials WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $filePath = $stmt->fetchColumn();
        if (!$filePath) error_response('Not found', 404);
        $fullPath = __DIR__ . '/../storage/course-materials/' . $filePath;
        if (!file_exists($fullPath)) error_response('File missing', 404);
        $url = '/backend/storage/course-materials/' . $filePath; // adjust to server URL
        json_response(['url' => $url]);
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
        $sql = 'UPDATE course_materials SET ' . implode(',', $fields) . ' WHERE id = :id';
        get_pdo()->prepare($sql)->execute($params);
        json_response(['updated' => true]);
    }

    public static function destroy(string $id): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path FROM course_materials WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $filePath = $stmt->fetchColumn();
        $pdo->prepare('DELETE FROM course_materials WHERE id = :id')->execute([':id' => $id]);
        if ($filePath) {
            $full = __DIR__ . '/../storage/course-materials/' . $filePath;
            if (file_exists($full)) @unlink($full);
        }
        json_response(['deleted' => true]);
    }

    public static function reorder(): void {
        $userId = require_user();
        admin_or_teacher_required($userId);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $order = $input['order'] ?? [];
        if (!is_array($order) || empty($order)) {
            error_response('order array required', 400);
        }
        $pdo = get_pdo();
        $pdo->beginTransaction();
        try {
            foreach ($order as $index => $materialId) {
                $stmt = $pdo->prepare('UPDATE course_materials SET order_index = :idx WHERE id = :id');
                $stmt->execute([':idx' => $index, ':id' => $materialId]);
            }
            $pdo->commit();
            json_response(['reordered' => true]);
        } catch (Exception $e) {
            $pdo->rollBack();
            error_response('Reorder failed', 500, ['details' => $e->getMessage()]);
        }
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
