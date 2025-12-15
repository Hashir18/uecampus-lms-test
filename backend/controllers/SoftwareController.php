<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class SoftwareController {
    public static function index(): void {
        require_user();
        json_response(get_pdo()->query('SELECT * FROM softwares ORDER BY created_at DESC')->fetchAll());
    }

    public static function store(): void {
        $uid = require_user();
        admin_required($uid);
        $title = $_POST['title'] ?? '';
        if (!$title) error_response('title required', 400);
        $coverUrl = null;
        if (!empty($_FILES['cover'])) {
            $coverUrl = self::storeCover($_FILES['cover']);
        }
        $id = self::uuid();
        get_pdo()->prepare('INSERT INTO softwares (id,title,description,version,category,cover_image_url,download_url,uploaded_by) VALUES (:id,:title,:desc,:ver,:cat,:cover,:dl,:by)')
            ->execute([
                ':id' => $id,
                ':title' => $title,
                ':desc' => $_POST['description'] ?? null,
                ':ver' => $_POST['version'] ?? null,
                ':cat' => $_POST['category'] ?? null,
                ':cover' => $coverUrl,
                ':dl' => $_POST['download_url'] ?? null,
                ':by' => $uid
            ]);
        json_response(['id' => $id], 201);
    }

    public static function update(string $id): void {
        $uid = require_user();
        admin_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!$input) error_response('No fields', 400);
        $fields = [];
        $params = [':id' => $id];
        foreach ($input as $k => $v) {
            $fields[] = "{$k} = :{$k}";
            $params[":{$k}"] = $v;
        }
        get_pdo()->prepare('UPDATE softwares SET ' . implode(',', $fields) . ' WHERE id = :id')->execute($params);
        json_response(['updated' => true]);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        admin_required($uid);
        get_pdo()->prepare('DELETE FROM softwares WHERE id = :id')->execute([':id' => $id]);
        json_response(['deleted' => true]);
    }

    private static function storeCover(array $file): string {
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = time() . '-' . bin2hex(random_bytes(4)) . ".{$ext}";
        $destDir = __DIR__ . '/../storage/software-covers';
        if (!is_dir($destDir)) mkdir($destDir, 0775, true);
        $destPath = $destDir . '/' . $fileName;
        if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Cover upload failed', 500);
        return '/backend/storage/software-covers/' . $fileName;
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
