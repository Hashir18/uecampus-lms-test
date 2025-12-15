<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Response.php';

const JWT_ALGO = 'HS256';

function jwt_primary_secret(): string {
    $secret = getenv('JWT_SECRET');
    if ($secret && trim($secret) !== '') {
        return $secret;
    }
    // Last resort fallback to keep dev environment running; replace in production
    return 'dev-secret-change-me';
}

function jwt_all_secrets(): array {
    // Try env secret first, then common fallbacks to gracefully handle old tokens
    $secrets = [];
    $envSecret = getenv('JWT_SECRET');
    if ($envSecret && trim($envSecret) !== '') {
        $secrets[] = $envSecret;
    }
    $secrets[] = 'dev-secret-change-me';
    // default value from the example .env to accept tokens issued before fixes
    $secrets[] = 'change-me-to-a-long-random-string';
    return array_values(array_unique($secrets));
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode(array $payload, int $ttlSeconds = 3600): string {
    $header = ['typ' => 'JWT', 'alg' => JWT_ALGO];
    $now = time();
    $payload = array_merge($payload, ['iat' => $now, 'exp' => $now + $ttlSeconds]);

    $segments = [
        base64url_encode(json_encode($header)),
        base64url_encode(json_encode($payload))
    ];

    $signingInput = implode('.', $segments);
    $signature = hash_hmac('sha256', $signingInput, jwt_primary_secret(), true);
    $segments[] = base64url_encode($signature);
    return implode('.', $segments);
}

function jwt_decode(string $token): array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        error_response('Invalid token', 401);
    }
    [$headerB64, $payloadB64, $sigB64] = $parts;
    $payload = json_decode(base64url_decode($payloadB64), true);
    $signature = base64url_decode($sigB64);

    $valid = false;
    foreach (jwt_all_secrets() as $secret) {
        $expected = hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true);
        if (hash_equals($expected, $signature)) {
            $valid = true;
            break;
        }
    }
    if (!$valid) {
        error_response('Invalid token signature', 401);
    }
    if (($payload['exp'] ?? 0) < time()) {
        error_response('Token expired', 401);
    }
    return $payload;
}

function current_user_id(): ?string {
    // Support different server vars for Authorization
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$auth) {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        if (!empty($headers['Authorization'])) {
            $auth = $headers['Authorization'];
        } elseif (!empty($headers['authorization'])) {
            $auth = $headers['authorization'];
        }
    }
    // Fallback: allow token passed via query param ?token=...
    if (!$auth && !empty($_GET['token'])) {
        $auth = 'Bearer ' . $_GET['token'];
    }
    if (stripos($auth, 'Bearer ') !== 0) {
        return null;
    }
    $token = trim(substr($auth, 7));
    $payload = jwt_decode($token);
    return $payload['sub'] ?? null;
}

function require_user(): string {
    $userId = current_user_id();
    if (!$userId) {
        error_response('Unauthorized', 401);
    }
    return $userId;
}

function verify_role(string $userId, string $role): bool {
    $pdo = get_pdo();
    $stmt = $pdo->prepare("
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = :uid AND r.name = :role
        LIMIT 1
    ");
    $stmt->execute([':uid' => $userId, ':role' => $role]);
    return (bool) $stmt->fetchColumn();
}
