<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../middleware/RoleMiddleware.php';
require_once __DIR__ . '/../config/database.php';

class DashboardController {
    public static function stats(): void {
        require_user();
        $row = get_pdo()->query('SELECT * FROM dashboard_stats LIMIT 1')->fetch();
        json_response($row ?: []);
    }

    public static function update(): void {
        $uid = require_user();
        admin_required($uid);
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        if (!$input) error_response('No fields', 400);
        $fields = [];
        $params = [];
        foreach ($input as $k => $v) {
            $fields[] = "{$k} = :{$k}";
            $params[":{$k}"] = $v;
        }
        get_pdo()->prepare('UPDATE dashboard_stats SET ' . implode(',', $fields) . ' LIMIT 1')->execute($params);
        json_response(['updated' => true]);
    }
}
