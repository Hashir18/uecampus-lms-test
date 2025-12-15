<?php
require_once __DIR__ . '/../helpers/Auth.php';

function auth_required(): string {
    return require_user();
}
