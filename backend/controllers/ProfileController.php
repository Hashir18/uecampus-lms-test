<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';

class ProfileController {
    public static function update(): void {
        $uid = require_user();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (isset($input['full_name'])) {
            $name = $input['full_name'];
            $pdo = get_pdo();
            $pdo->prepare('UPDATE users SET full_name = :name WHERE id = :id')->execute([':name' => $name, ':id' => $uid]);
            $pdo->prepare('UPDATE profiles SET full_name = :name WHERE id = :id')->execute([':name' => $name, ':id' => $uid]);
        }
        json_response(['updated' => true]);
    }

    public static function avatar(): void {
        $uid = require_user();
        if (empty($_FILES['avatar'])) error_response('No file uploaded', 400);
        $file = $_FILES['avatar'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = $uid . '/' . time() . '-' . bin2hex(random_bytes(4)) . ".{$ext}";
        $destDir = __DIR__ . '/../storage/avatars/' . $uid;
        if (!is_dir($destDir)) mkdir($destDir, 0775, true);
        $destPath = $destDir . '/' . basename($fileName);
        if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Upload failed', 500);
        $url = '/backend/storage/avatars/' . $fileName;
        $pdo = get_pdo();
        $pdo->prepare('UPDATE users SET avatar_url = :url WHERE id = :id')->execute([':url' => $url, ':id' => $uid]);
        $pdo->prepare('UPDATE profiles SET avatar_url = :url WHERE id = :id')->execute([':url' => $url, ':id' => $uid]);
        json_response(['avatar_url' => $url]);
    }
}
