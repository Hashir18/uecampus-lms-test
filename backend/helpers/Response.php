<?php

function json_response($data = null, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    if ($data === null) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode($data);
    }
    exit;
}

function error_response(string $message, int $status = 400, array $extra = []): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(array_merge(['error' => $message], $extra));
    exit;
}
