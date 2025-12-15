<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class GuideAssetController {
    public static function list(): void {
        require_user();
        json_response(get_pdo()->query('SELECT * FROM lms_guides ORDER BY created_at DESC')->fetchAll());
    }

    public static function upload(): void {
        $uid = require_user();
        admin_required($uid);
        if (empty($_FILES['file']) && empty($_POST['youtube_url'])) {
            error_response('File or youtube_url required', 400);
        }
        $title = $_POST['title'] ?? '';
        if (!$title) error_response('title required', 400);
        $guideType = $_POST['guide_type'] ?? 'video';
        $filePath = null;
        if (!empty($_FILES['file'])) {
            $file = $_FILES['file'];
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $fileName = time() . '-' . bin2hex(random_bytes(4)) . ".{$ext}";
            $destDir = __DIR__ . '/../storage/lms-guides';
            if (!is_dir($destDir)) mkdir($destDir, 0775, true);
            $destPath = $destDir . '/' . $fileName;
            if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Upload failed', 500);
            $filePath = '/backend/storage/lms-guides/' . $fileName;
        }
        $id = self::uuid();
        get_pdo()->prepare('INSERT INTO lms_guides (id,title,description,guide_type,file_path,thumbnail_url,youtube_url,duration,uploaded_by) VALUES (:id,:title,:desc,:type,:file,:thumb,:yt,:dur,:by)')
            ->execute([
                ':id' => $id,
                ':title' => $title,
                ':desc' => $_POST['description'] ?? null,
                ':type' => $guideType,
                ':file' => $filePath,
                ':thumb' => $_POST['thumbnail_url'] ?? null,
                ':yt' => $_POST['youtube_url'] ?? null,
                ':dur' => $_POST['duration'] ?? null,
                ':by' => $uid
            ]);
        json_response(['id' => $id], 201);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        admin_required($uid);
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path FROM lms_guides WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $filePath = $stmt->fetchColumn();
        $pdo->prepare('DELETE FROM lms_guides WHERE id = :id')->execute([':id' => $id]);
        if ($filePath && str_starts_with($filePath, '/backend/storage/lms-guides/')) {
            $local = __DIR__ . '/../' . ltrim($filePath, '/backend/');
            if (file_exists($local)) @unlink($local);
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
