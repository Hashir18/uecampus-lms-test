<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class CertificateController {
    public static function index(): void {
        $uid = require_user();
        $pdo = get_pdo();
        $all = !empty($_GET['all']);
        $base = self::apiBase() . '/certificates';
        if ($all && verify_role($uid, 'admin')) {
            $stmt = $pdo->query('SELECT c.*, u.full_name AS student_name, u.email AS student_email, cr.title AS course_title, cr.code AS course_code FROM certificates c LEFT JOIN users u ON u.id = c.user_id LEFT JOIN courses cr ON cr.id = c.course_id');
        } else {
            $stmt = $pdo->prepare('SELECT c.*, cr.title AS course_title, cr.code AS course_code FROM certificates c LEFT JOIN courses cr ON cr.id = c.course_id WHERE c.user_id = :uid');
            $stmt->execute([':uid' => $uid]);
        }
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            if (!empty($row['file_path'])) {
                $row['file_url'] = $base . '/' . $row['id'] . '/file';
            }
        }
        json_response($rows);
    }

    public static function store(): void {
        $uid = require_user();
        admin_required($uid);
        self::ensureFilePathColumn();
        self::ensureSignatureColumn();

        $input = [];
        if (!empty($_FILES) || ($_SERVER['CONTENT_TYPE'] ?? '') === 'multipart/form-data') {
            // Multipart form-data
            $input['user_id'] = $_POST['user_id'] ?? null;
            $input['course_id'] = $_POST['course_id'] ?? null;
            $input['certificate_number'] = $_POST['certificate_number'] ?? null;
            $input['issued_date'] = $_POST['issued_date'] ?? null;
            $input['completion_date'] = $_POST['completion_date'] ?? null;
            $input['signature_text'] = $_POST['signature_text'] ?? null;
        } else {
            $input = json_decode(file_get_contents('php://input'), true) ?: [];
        }

        $required = ['user_id','course_id','certificate_number'];
        foreach ($required as $f) if (empty($input[$f])) error_response("Missing {$f}", 400);
        $id = self::uuid();

        $filePath = null;
        if (!empty($_FILES['file'])) {
            $file = $_FILES['file'];
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $safeExt = preg_replace('/[^a-zA-Z0-9]/', '', $ext);
            if (!$safeExt) $safeExt = 'pdf';
            $fileName = "{$input['user_id']}/" . time() . "-{$id}." . $safeExt;
            $destDir = __DIR__ . "/../storage/certificates/" . dirname($fileName);
            if (!is_dir($destDir)) mkdir($destDir, 0775, true);
            $destPath = __DIR__ . "/../storage/certificates/{$fileName}";
            if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Failed to store file', 500);
            $filePath = $fileName;
        }

        get_pdo()->prepare('INSERT INTO certificates (id,user_id,course_id,certificate_number,issued_date,completion_date,generated_by,file_path,signature_text) VALUES (:id,:uid,:cid,:num,:issued,:completed,:by,:path,:sig)')
            ->execute([
                ':id' => $id,
                ':uid' => $input['user_id'],
                ':cid' => $input['course_id'],
                ':num' => $input['certificate_number'],
                ':issued' => $input['issued_date'] ?? date('Y-m-d'),
                ':completed' => $input['completion_date'] ?? date('Y-m-d'),
                ':by' => $uid,
                ':path' => $filePath,
                ':sig' => $input['signature_text'] ?? null
            ]);

        $payload = ['id' => $id];
        if ($filePath) {
            $payload['file_url'] = self::apiBase() . '/certificates/' . $id . '/file';
        }
        json_response($payload, 201);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        admin_required($uid);
        get_pdo()->prepare('DELETE FROM certificates WHERE id = :id')->execute([':id' => $id]);
        json_response(['deleted' => true]);
    }

    public static function pdf(string $id): void {
        $uid = require_user();
        $stmt = get_pdo()->prepare('SELECT c.*, u.full_name AS student_name, u.email AS student_email, cr.title AS course_title FROM certificates c LEFT JOIN users u ON u.id = c.user_id LEFT JOIN courses cr ON cr.id = c.course_id WHERE c.id = :id');
        $stmt->execute([':id' => $id]);
        $cert = $stmt->fetch();
        if (!$cert) error_response('Not found', 404);
        if ($cert['user_id'] !== $uid && !verify_role($uid, 'admin')) error_response('Forbidden', 403);
        if (!empty($cert['file_path'])) {
            $cert['file_url'] = self::apiBase() . '/certificates/' . $cert['id'] . '/file';
        }
        json_response([
            'certificate' => $cert,
            'pdf' => null, // integrate dompdf/other if desired
        ]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private static function ensureFilePathColumn(): void {
        $pdo = get_pdo();
        try {
            $pdo->query("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS file_path VARCHAR(255) NULL AFTER generated_by");
        } catch (PDOException $e) {
            // ignore if exists or not supported
        }
    }

    private static function ensureSignatureColumn(): void {
        $pdo = get_pdo();
        try {
            $pdo->query("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS signature_text VARCHAR(255) NULL AFTER file_path");
        } catch (PDOException $e) {
            // ignore if exists
        }
    }

    private static function apiBase(): string {
        $root = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return $scheme . $host . $root . '/api';
    }

    public static function file(string $id): void {
        $uid = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT user_id, file_path FROM certificates WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) error_response('Not found', 404);
        if ($row['user_id'] !== $uid && !verify_role($uid, 'admin')) error_response('Forbidden', 403);
        if (empty($row['file_path'])) error_response('No file', 404);
        $full = __DIR__ . '/../storage/certificates/' . $row['file_path'];
        if (!file_exists($full)) error_response('File missing', 404);
        $mime = mime_content_type($full) ?: 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="' . basename($full) . '"');
        readfile($full);
        exit;
    }
}
