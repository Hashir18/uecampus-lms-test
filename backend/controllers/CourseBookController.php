<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class CourseBookController {
    public static function list(): void {
        require_user();
        $courseId = $_GET['course_id'] ?? null;
        $pdo = get_pdo();
        if ($courseId) {
            $stmt = $pdo->prepare('SELECT * FROM course_books WHERE course_id = :cid');
            $stmt->execute([':cid' => $courseId]);
            json_response($stmt->fetchAll());
            return;
        }
        json_response($pdo->query('SELECT * FROM course_books')->fetchAll());
    }

    public static function upload(): void {
        $uid = require_user();
        admin_required($uid);
        if (empty($_FILES['file'])) error_response('No file uploaded', 400);
        $courseId = $_POST['course_id'] ?? '';
        $title = $_POST['title'] ?? '';
        if (!$courseId || !$title) error_response('course_id and title required', 400);
        $file = $_FILES['file'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = $courseId . '/' . time() . '-' . bin2hex(random_bytes(4)) . ".{$ext}";
        $destDir = __DIR__ . '/../storage/course-books/' . dirname($fileName);
        if (!is_dir($destDir)) mkdir($destDir, 0775, true);
        $destPath = __DIR__ . '/../storage/course-books/' . $fileName;
        if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Upload failed', 500);
        $id = self::uuid();
        get_pdo()->prepare('INSERT INTO course_books (id,course_id,title,description,file_path,file_type,file_size,uploaded_by,cover_image_url) VALUES (:id,:cid,:title,:desc,:path,:type,:size,:by,:cover)')
            ->execute([
                ':id' => $id,
                ':cid' => $courseId,
                ':title' => $title,
                ':desc' => $_POST['description'] ?? null,
                ':path' => $fileName,
                ':type' => $file['type'],
                ':size' => $file['size'],
                ':by' => $uid,
                ':cover' => $_POST['cover_image_url'] ?? null
            ]);
        json_response(['id' => $id, 'file_path' => $fileName], 201);
    }

    public static function signedUrl(string $id): void {
        require_user();
        $stmt = get_pdo()->prepare('SELECT file_path FROM course_books WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $filePath = $stmt->fetchColumn();
        if (!$filePath) error_response('Not found', 404);
        json_response(['url' => '/backend/storage/course-books/' . $filePath]);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        admin_required($uid);
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path FROM course_books WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $filePath = $stmt->fetchColumn();
        $pdo->prepare('DELETE FROM course_books WHERE id = :id')->execute([':id' => $id]);
        if ($filePath) {
            $full = __DIR__ . '/../storage/course-books/' . $filePath;
            if (file_exists($full)) @unlink($full);
        }
        json_response(['deleted' => true]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
