<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class SectionController {
    public static function store(): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $courseId = $input['course_id'] ?? '';
        $title = $input['title'] ?? '';
        if (!$courseId || !$title) error_response('course_id and title required', 400);
        $id = self::uuid();
        $order = $input['order_index'] ?? 0;
        get_pdo()->prepare('INSERT INTO course_sections (id, course_id, title, description, order_index) VALUES (:id,:cid,:title,:desc,:ord)')
            ->execute([
                ':id' => $id,
                ':cid' => $courseId,
                ':title' => $title,
                ':desc' => $input['description'] ?? null,
                ':ord' => $order
            ]);
        json_response(['id' => $id], 201);
    }

    public static function update(string $id): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!$input) error_response('No fields', 400);
        $fields = [];
        $params = [':id' => $id];
        foreach ($input as $k => $v) {
            $fields[] = "{$k} = :{$k}";
            $params[":{$k}"] = $v;
        }
        get_pdo()->prepare('UPDATE course_sections SET ' . implode(',', $fields) . ' WHERE id = :id')->execute($params);
        json_response(['updated' => true]);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        get_pdo()->prepare('DELETE FROM course_sections WHERE id = :id')->execute([':id' => $id]);
        json_response(['deleted' => true]);
    }

    public static function reorder(): void {
        $uid = require_user();
        admin_or_teacher_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $order = $input['order'] ?? [];
        if (!is_array($order) || empty($order)) {
            error_response('order array required', 400);
        }
        $pdo = get_pdo();
        $pdo->beginTransaction();
        try {
            foreach ($order as $index => $sectionId) {
                $stmt = $pdo->prepare('UPDATE course_sections SET order_index = :idx WHERE id = :id');
                $stmt->execute([':idx' => $index, ':id' => $sectionId]);
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
