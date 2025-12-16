<?php
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../config/database.php';

class TimetableController {
    public static function index(): void {
        $uid = require_user();
        $stmt = get_pdo()->prepare('SELECT * FROM timetable WHERE user_id = :uid OR user_id IS NULL ORDER BY day_of_week, start_time');
        $stmt->execute([':uid' => $uid]);
        json_response($stmt->fetchAll());
    }

    public static function store(): void {
        $uid = require_user();
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $required = ['course_code','course_name','day_of_week','start_time','end_time'];
        foreach ($required as $f) if (empty($input[$f])) error_response("Missing {$f}", 400);
        $id = self::uuid();
        get_pdo()->prepare('INSERT INTO timetable (id,user_id,course_code,course_name,day_of_week,start_time,end_time,instructor,room,notes,color) VALUES (:id,:uid,:code,:name,:dow,:start,:end,:instr,:room,:notes,:color)')
            ->execute([
                ':id' => $id,
                ':uid' => $uid,
                ':code' => $input['course_code'],
                ':name' => $input['course_name'],
                ':dow' => $input['day_of_week'],
                ':start' => $input['start_time'],
                ':end' => $input['end_time'],
                ':instr' => $input['instructor'] ?? null,
                ':room' => $input['room'] ?? null,
                ':notes' => $input['notes'] ?? null,
                ':color' => $input['color'] ?? null
            ]);
        json_response(['id' => $id], 201);
    }

    public static function destroy(string $id): void {
        $uid = require_user();
        get_pdo()->prepare('DELETE FROM timetable WHERE id = :id AND user_id = :uid')->execute([':id' => $id, ':uid' => $uid]);
        json_response(['deleted' => true]);
    }

    private static function uuid(): string {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
