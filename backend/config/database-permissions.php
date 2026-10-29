<?php
declare(strict_types=1);
// Runtime DML only. Schema and account administration stay in CLI maintenance.
return [
    'admins'=>'SELECT,INSERT,UPDATE', 'auth_attempts'=>'SELECT,INSERT,DELETE',
    'sites'=>'SELECT,INSERT,UPDATE', 'employees'=>'SELECT,INSERT,UPDATE', 'categories'=>'SELECT,INSERT',
    'courses'=>'SELECT,INSERT,UPDATE', 'files'=>'SELECT,INSERT,DELETE', 'exams'=>'SELECT,INSERT,UPDATE',
    'enrollments'=>'SELECT,INSERT,UPDATE', 'attempts'=>'SELECT,INSERT,UPDATE,DELETE',
    'activity_log'=>'SELECT,INSERT,UPDATE', 'file_previews'=>'SELECT,INSERT,UPDATE',
    'events'=>'SELECT,INSERT,UPDATE,DELETE', 'event_images'=>'SELECT,INSERT,DELETE',
    'home_popup'=>'SELECT,INSERT,UPDATE,DELETE', 'home_popup_guard'=>'SELECT,UPDATE',
    'home_slides'=>'SELECT,INSERT,UPDATE,DELETE', 'announcements'=>'SELECT', 'portal_media_migrations'=>'SELECT',
];
