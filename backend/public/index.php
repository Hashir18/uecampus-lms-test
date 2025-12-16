<?php
// Front controller
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Env.php';

// Load .env for local development (adjust path if moved)
load_env(__DIR__ . '/../../.env');

// autoload controllers
foreach (glob(__DIR__ . '/../controllers/*.php') as $file) {
    require_once $file;
}

$routes = require __DIR__ . '/../routes/api.php';
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalize path to remove directory prefix (e.g., /uecampus-lms-main/backend/public)
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
if ($base && $base !== '/') {
    if (strpos($path, $base) === 0) {
        $path = substr($path, strlen($base));
    }
}
if ($path === '') {
    $path = '/';
}

foreach ($routes as [$routeMethod, $pattern, $handler]) {
    if ($method !== $routeMethod) continue;
    if (preg_match($pattern, $path, $matches)) {
        array_shift($matches); // remove full match
        [$class, $action] = $handler;
        if (!class_exists($class) || !method_exists($class, $action)) {
            error_response('Handler not found', 500);
        }
        call_user_func_array([$class, $action], $matches);
        exit;
    }
}

error_response('Not found', 404);
