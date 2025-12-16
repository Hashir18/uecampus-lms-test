<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';

class UploadController {
    public static function richtext(): void {
        require_user(); // any authenticated user can upload inline video
        if (empty($_FILES['file'])) error_response('No file uploaded', 400);
        $file = $_FILES['file'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $fileName = 'richtext/' . time() . '-' . bin2hex(random_bytes(4)) . ".{$ext}";
        $destDir = __DIR__ . '/../storage/course-materials/' . dirname($fileName);
        if (!is_dir($destDir)) mkdir($destDir, 0775, true);
        $destPath = __DIR__ . '/../storage/course-materials/' . $fileName;
        if (!move_uploaded_file($file['tmp_name'], $destPath)) error_response('Upload failed', 500);
        $url = '/backend/storage/course-materials/' . $fileName;
        json_response(['url' => $url], 201);
    }
}
