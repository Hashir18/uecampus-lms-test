<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class DocumentController {
    public static function index(): void {
        $userId = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT * FROM user_documents WHERE user_id = :uid ORDER BY created_at DESC');
        $stmt->execute([':uid' => $userId]);
        json_response($stmt->fetchAll());
    }

    public static function store(): void {
        $uid = require_user();
        // Admin-only uploads for user documents
        admin_required($uid);
        if (empty($_FILES['file'])) error_response('No file uploaded', 400);
        $file = $_FILES['file'];
        $title = $_POST['title'] ?? $file['name'];
        $userTarget = $_POST['user_id'] ?? $uid;
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = "{$userTarget}/" . time() . '-' . bin2hex(random_bytes(4)) . ".{$ext}";
        $destDir = __DIR__ . "/../storage/user-documents/" . dirname($fileName);
        if (!is_dir($destDir)) mkdir($destDir, 0775, true);
        $destPath = __DIR__ . "/../storage/user-documents/{$fileName}";
        if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Store failed', 500);

        $pdo = get_pdo();
        $id = self::uuid();
        $pdo->prepare('INSERT INTO user_documents (id,user_id,uploaded_by,title,file_path,file_type) VALUES (:id,:uid,:by,:title,:path,:type)')
            ->execute([
                ':id' => $id,
                ':uid' => $userTarget,
                ':by' => $uid,
                ':title' => $title,
                ':path' => $fileName,
                ':type' => $file['type']
            ]);
        json_response(['id' => $id, 'file_path' => $fileName], 201);
    }

    public static function signedUrl(string $id): void {
        $uid = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path, user_id FROM user_documents WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $doc = $stmt->fetch();
        if (!$doc) error_response('Not found', 404);
        if ($doc['user_id'] !== $uid && !verify_role($uid, 'admin')) error_response('Forbidden', 403);
        json_response(['url' => '/backend/storage/user-documents/' . $doc['file_path']]);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT file_path, uploaded_by FROM user_documents WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $doc = $stmt->fetch();
        if (!$doc) error_response('Not found', 404);
        if ($doc['uploaded_by'] !== $uid && !verify_role($uid, 'admin')) error_response('Forbidden', 403);
        $pdo->prepare('DELETE FROM user_documents WHERE id = :id')->execute([':id' => $id]);
        if ($doc['file_path']) {
            $full = __DIR__ . '/../storage/user-documents/' . $doc['file_path'];
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
