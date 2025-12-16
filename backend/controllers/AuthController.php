<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';

class AuthController {
    public static function login(): void {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        if (!$email || !$password) {
            error_response('Email and password required', 400);
        }
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT u.*, p.user_id AS user_code, p.is_blocked AS profile_blocked FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            error_response('Invalid credentials', 401);
        }
        $blocked = !empty($user['is_blocked']) || !empty($user['profile_blocked']);
        if ($blocked) {
            error_response('Account blocked', 403);
        }
        $token = jwt_encode(['sub' => $user['id'], 'email' => $user['email']], 60 * 60 * 24);
        json_response([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'avatar_url' => $user['avatar_url'],
                'is_blocked' => $blocked,
                'user_code' => $user['user_code'] ?? null,
            ],
            'roles' => self::getRoles($user['id'])
        ]);
    }

    public static function register(): void {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $fullName = trim($input['full_name'] ?? '');
        $role = $input['role'] ?? 'student';
        $userId = $input['user_id'] ?? null;

        if (!$email || !$password || !$fullName) {
            error_response('Missing required fields', 400);
        }
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
        $stmt->execute([':email' => $email]);
        if ($stmt->fetch()) {
            error_response('Email already exists', 409);
        }
        $id = $userId ?: self::uuid();
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $pdo->prepare('INSERT INTO users (id, email, password_hash, full_name, is_blocked) VALUES (:id,:email,:hash,:name,0)')
            ->execute([':id' => $id, ':email' => $email, ':hash' => $hash, ':name' => $fullName]);
        $pdo->prepare('INSERT INTO profiles (id, user_id, email, full_name) VALUES (:id,:uid,:email,:name)')
            ->execute([':id' => $id, ':uid' => $userId, ':email' => $email, ':name' => $fullName]);

        $roleId = self::roleId($role);
        $pdo->prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (:id,:uid,:rid)')
            ->execute([':id' => self::uuid(), ':uid' => $id, ':rid' => $roleId]);

        json_response(['user_id' => $id], 201);
    }

    public static function me(): void {
        $userId = require_user();
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT u.id, u.email, u.full_name, u.avatar_url, u.is_blocked, p.user_id AS user_code, p.is_blocked AS profile_blocked FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = :id');
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();
        if (!$user) {
            error_response('User not found', 404);
        }
        $user['is_blocked'] = !empty($user['is_blocked']) || !empty($user['profile_blocked']);
        $roles = self::getRoles($userId);
        json_response(['user' => $user, 'roles' => $roles]);
    }

    private static function getRoles(string $userId): array {
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = :uid');
        $stmt->execute([':uid' => $userId]);
        return array_column($stmt->fetchAll(), 'name');
    }

    private static function roleId(string $roleName): int {
        $pdo = get_pdo();
        $stmt = $pdo->prepare('SELECT id FROM roles WHERE name = :name');
        $stmt->execute([':name' => $roleName]);
        $roleId = $stmt->fetchColumn();
        if (!$roleId) {
            error_response('Unknown role', 400);
        }
        return (int) $roleId;
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
