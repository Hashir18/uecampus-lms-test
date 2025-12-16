<?php
$pdo=new PDO("mysql:host=127.0.0.1;port=3306;dbname=uecampus_lms;charset=utf8mb4","root","");
$user='784a27c1-700c-4b01-8b20-2a87d1f256e9';
$enroll=$pdo->prepare('SELECT * FROM enrollments WHERE user_id=?');
$enroll->execute([$user]);
print "Enrollments\n";
print_r($enroll->fetchAll(PDO::FETCH_ASSOC));
$courses=$pdo->query('SELECT id,title FROM courses')->fetchAll(PDO::FETCH_ASSOC);
print "Courses\n";
print_r($courses);
?>
