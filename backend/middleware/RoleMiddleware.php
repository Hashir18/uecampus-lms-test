<?php
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

function admin_required(string $userId): void {
    if (!verify_role($userId, 'admin')) {
        error_response('Forbidden: admin only', 403);
    }
}

function admin_or_teacher_required(string $userId): void {
    if (verify_role($userId, 'admin') || verify_role($userId, 'teacher')) {
        return;
    }
    error_response('Forbidden: admin or teacher only', 403);
}

function role_required(string $userId, string $role): void {
    if (!verify_role($userId, $role)) {
        error_response('Forbidden', 403);
    }
}

/**
 * Allow either admins or accounts role.
 */
function admin_or_accounts_required(string $userId): void {
    if (verify_role($userId, 'admin') || verify_role($userId, 'accounts')) {
        return;
    }
    error_response('Forbidden: admin or accounts only', 403);
}
