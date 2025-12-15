<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';

class PreferenceController {
    public static function get(): void {
        $uid = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT birthday_mode FROM user_preferences WHERE user_id = :uid');
        $stmt->execute([':uid' => $uid]);
        $row = $stmt->fetch();
        json_response(['birthday_mode' => $row['birthday_mode'] ?? false]);
    }

    public static function set(): void {
        $uid = require_user();
        // Admin-controlled toggle
        admin_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $targetUser = $input['user_id'] ?? $uid;
        $enabled = !empty($input['birthday_mode']) ? 1 : 0;
        $pdo = get_pdo();
        $pdo->prepare('INSERT INTO user_preferences (id,user_id,birthday_mode) VALUES (:id,:uid,:bm) ON DUPLICATE KEY UPDATE birthday_mode = VALUES(birthday_mode)')
            ->execute([':id' => self::uuid(), ':uid' => $targetUser, ':bm' => $enabled]);
        json_response(['birthday_mode' => (bool)$enabled]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
