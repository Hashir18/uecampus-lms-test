<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class AdminController {
    public static function resetPassword(string $id): void {
        $uid = require_user();
        admin_or_accounts_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $newPass = $input['new_password'] ?? '';
        if (strlen($newPass) < 6) error_response('Password too short', 400);
        $hash = password_hash($newPass, PASSWORD_BCRYPT);
        get_pdo()->prepare('UPDATE users SET password_hash = :hash WHERE id = :id')->execute([':hash' => $hash, ':id' => $id]);
        json_response(['reset' => true]);
    }

    public static function impersonate(string $id): void {
        $uid = require_user();
        admin_or_accounts_required($uid);
        // generate admin-signed JWT for target user
        $token = jwt_encode(['sub' => $id, 'impersonated_by' => $uid], 3600);
        json_response(['token' => $token]);
    }
}
