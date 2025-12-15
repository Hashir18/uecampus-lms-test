<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';

class UserController {
    public static function index(): void {
        $uid = require_user();
        admin_or_accounts_required($uid);
        $pdo = get_pdo();
        $users = $pdo->query('SELECT u.id, u.email, u.full_name, u.avatar_url, u.is_blocked, p.user_id AS user_code FROM users u LEFT JOIN profiles p ON p.id = u.id')->fetchAll();
        foreach ($users as &$u) {
            $rolesStmt = $pdo->prepare('SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = :uid');
            $rolesStmt->execute([':uid' => $u['id']]);
            $u['roles'] = array_column($rolesStmt->fetchAll(), 'name');
        }
        json_response($users);
    }

    public static function store(): void {
        $adminId = require_user();
        admin_or_accounts_required($adminId);

        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $fullName = trim($input['full_name'] ?? '');
        $roleName = $input['role'] ?? 'student';
        $userCode = trim($input['user_id'] ?? '');
        $courseId = $input['course_id'] ?? null;

        if (!$email || !$password || !$fullName || !$userCode) {
            error_response('email, password, full_name, user_id are required', 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error_response('Invalid email', 400);
        }
        if (strlen($password) < 6) {
            error_response('Password must be at least 6 characters', 400);
        }

        $pdo = get_pdo();
        $pdo->beginTransaction();
        try {
            // Ensure role exists
            $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE name = :name');
            $roleStmt->execute([':name' => $roleName]);
            $roleId = $roleStmt->fetchColumn();
            if (!$roleId) {
                // Auto-create missing role (e.g., "accounts")
                $pdo->prepare('INSERT INTO roles (name) VALUES (:name)')->execute([':name' => $roleName]);
                $roleId = $pdo->lastInsertId();
            }

            // Create user
            $userId = self::uuid();
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $pdo->prepare('INSERT INTO users (id, email, password_hash, full_name, is_blocked) VALUES (:id,:email,:hash,:name,0)')
                ->execute([
                    ':id' => $userId,
                    ':email' => $email,
                    ':hash' => $hash,
                    ':name' => $fullName,
                ]);

            // Profile with user code
            $pdo->prepare('INSERT INTO profiles (id, user_id, email, full_name, is_blocked) VALUES (:id,:code,:email,:name,0)')
                ->execute([
                    ':id' => $userId,
                    ':code' => $userCode,
                    ':email' => $email,
                    ':name' => $fullName,
                ]);

            // Role link
            $pdo->prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (:id,:uid,:rid)')
                ->execute([
                    ':id' => self::uuid(),
                    ':uid' => $userId,
                    ':rid' => $roleId,
                ]);

            // Optional enrollment
            if ($courseId) {
                $pdo->prepare('INSERT INTO enrollments (id,user_id,course_id,status,role,enrolled_at,enrolled_by) VALUES (:id,:uid,:cid,:status,:role,NOW(),:by)')
                    ->execute([
                        ':id' => self::uuid(),
                        ':uid' => $userId,
                        ':cid' => $courseId,
                        ':status' => 'active',
                        ':role' => 'student',
                        ':by' => $adminId,
                    ]);
            }

            $pdo->commit();
            json_response(['id' => $userId], 201);
        } catch (PDOException $e) {
            $pdo->rollBack();
            $code = $e->errorInfo[1] ?? 0;
            if ($code === 1062) {
                error_response('Email or user ID already exists', 409);
            }
            error_response('Failed to create user: ' . $e->getMessage(), 400);
        } catch (Exception $e) {
            $pdo->rollBack();
            error_response($e->getMessage(), 400);
        }
    }

    public static function update(string $id): void {
        $uid = require_user();
        admin_or_accounts_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $fields = [];
        $params = [':id' => $id];
        if (isset($input['full_name'])) {
            $fields[] = 'full_name = :name';
            $params[':name'] = $input['full_name'];
        }
        if (isset($input['is_blocked'])) {
            $fields[] = 'is_blocked = :blocked';
            $params[':blocked'] = (int) $input['is_blocked'];
        }
        if ($fields) {
            $sql = 'UPDATE users SET ' . implode(',', $fields) . ' WHERE id = :id';
            $pdo = get_pdo();
            $pdo->prepare($sql)->execute($params);
            // Keep profiles table in sync for blocked status + name
            if (isset($input['is_blocked'])) {
                $pdo->prepare('UPDATE profiles SET is_blocked = :blocked WHERE id = :id')->execute([
                    ':blocked' => (int) $input['is_blocked'],
                    ':id' => $id
                ]);
            }
            if (isset($input['full_name'])) {
                $pdo->prepare('UPDATE profiles SET full_name = :name WHERE id = :id')->execute([
                    ':name' => $input['full_name'],
                    ':id' => $id
                ]);
            }
        }
        if (isset($input['role'])) {
            $pdo = get_pdo();
            $pdo->prepare('DELETE FROM user_roles WHERE user_id = :uid')->execute([':uid' => $id]);
            $roleId = $pdo->prepare('SELECT id FROM roles WHERE name = :name');
            $roleId->execute([':name' => $input['role']]);
            $rid = $roleId->fetchColumn();
            if (!$rid) {
                $pdo->prepare('INSERT INTO roles (name) VALUES (:name)')->execute([':name' => $input['role']]);
                $rid = $pdo->lastInsertId();
            }
            if ($rid) {
                $pdo->prepare('INSERT INTO user_roles (id, user_id, role_id) VALUES (:id,:uid,:rid)')
                    ->execute([':id' => self::uuid(), ':uid' => $id, ':rid' => $rid]);
            }
        }
        json_response(['updated' => true]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
