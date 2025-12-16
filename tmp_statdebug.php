<?php
require "backend/config/database.php";
require "backend/helpers/Auth.php";
$uid="784a27c1-700c-4b01-8b20-2a87d1f256e9";
$pdo=get_pdo();
$isPriv = verify_role($uid,'admin') || verify_role($uid,'teacher') || verify_role($uid,'accounts');
$scope='personal';
if($scope==='all' && $isPriv){
  $courseIds = $pdo->query('SELECT id FROM courses')->fetchAll(PDO::FETCH_COLUMN);
}else{
  $courseStmt=$pdo->prepare('SELECT course_id FROM enrollments WHERE user_id = :uid AND (status IS NULL OR status = "active")');
  $courseStmt->execute([':uid'=>$uid]);
  $courseIds = array_column($courseStmt->fetchAll(), 'course_id');
}
print_r($courseIds);
$totalCourses=count($courseIds);
if($totalCourses===0){echo "none\n";exit;}
$placeholders=implode(',',array_fill(0,$totalCourses,'?'));
$assignmentSql="SELECT COUNT(*) FROM assignments WHERE course IN ({$placeholders}) AND (is_hidden IS NULL OR is_hidden = 0)";
$quizSql="SELECT COUNT(*) FROM section_quizzes WHERE course_id IN ({$placeholders}) AND (is_hidden IS NULL OR is_hidden = 0)";
$stmt=$pdo->prepare($assignmentSql);$stmt->execute($courseIds);echo "Assignments:".$stmt->fetchColumn()."\n";
$stmt=$pdo->prepare($quizSql);$stmt->execute($courseIds);echo "Quizzes:".$stmt->fetchColumn()."\n";
$completedParams=array_merge([$uid],$courseIds);
$completedSql="SELECT COUNT(*) FROM progress_tracking WHERE user_id = ? AND status = 'completed' AND item_type IN ('assignment','quiz') AND course_id IN ({$placeholders})";
$stmt=$pdo->prepare($completedSql);$stmt->execute($completedParams);echo "Completed:".$stmt->fetchColumn()."\n";
?>
