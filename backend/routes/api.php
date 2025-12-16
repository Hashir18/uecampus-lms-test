<?php
// Define route map as [METHOD, pattern, handler]
return [
    ['POST', '#^/api/auth/login$#', ['AuthController', 'login']],
    ['POST', '#^/api/auth/register$#', ['AuthController', 'register']],
    ['GET',  '#^/api/auth/me$#', ['AuthController', 'me']],

    ['GET',  '#^/api/users$#', ['UserController', 'index']],
    ['POST', '#^/api/users$#', ['UserController', 'store']],
    ['PATCH','#^/api/users/([a-f0-9-]+)$#', ['UserController', 'update']],

    ['GET',  '#^/api/courses$#', ['CourseController', 'index']],
    ['GET',  '#^/api/courses/([a-f0-9-]+)$#', ['CourseController', 'show']],
    ['POST', '#^/api/courses$#', ['CourseController', 'store']],
    ['PATCH','#^/api/courses/([a-f0-9-]+)$#', ['CourseController', 'update']],
    ['DELETE','#^/api/courses/([a-f0-9-]+)$#', ['CourseController', 'destroy']],

    ['POST', '#^/api/materials$#', ['MaterialController', 'upload']],
    ['GET',  '#^/api/materials/([a-f0-9-]+)/signed-url$#', ['MaterialController', 'signedUrl']],
    ['PATCH','#^/api/materials/([a-f0-9-]+)$#', ['MaterialController', 'update']],
    ['DELETE','#^/api/materials/([a-f0-9-]+)$#', ['MaterialController', 'destroy']],
    ['POST', '#^/api/materials/reorder$#', ['MaterialController', 'reorder']],

    ['GET',  '#^/api/assignments$#', ['AssignmentController', 'index']],
    ['POST', '#^/api/assignments$#', ['AssignmentController', 'store']],
    ['PATCH','#^/api/assignments/([a-f0-9-]+)$#', ['AssignmentController', 'update']],
    ['DELETE','#^/api/assignments/([a-f0-9-]+)$#', ['AssignmentController', 'destroy']],
    ['POST', '#^/api/assignments/([a-f0-9-]+)/submit$#', ['AssignmentController', 'submit']],
    ['POST', '#^/api/assignments/([a-f0-9-]+)/deadline$#', ['AssignmentController', 'deadline']],
    ['POST', '#^/api/assignments/([a-f0-9-]+)/extra-attempts$#', ['AssignmentController', 'extraAttempts']],
    ['GET',  '#^/api/assignments/([a-f0-9-]+)/attempts$#', ['AssignmentController', 'attempts']],

    ['GET',  '#^/api/quizzes$#', ['QuizController', 'index']],
    ['POST', '#^/api/quizzes$#', ['QuizController', 'store']],
    ['PATCH','#^/api/quizzes/([a-f0-9-]+)$#', ['QuizController', 'update']],
    ['DELETE','#^/api/quizzes/([a-f0-9-]+)$#', ['QuizController', 'destroy']],
    ['POST', '#^/api/quizzes/([a-f0-9-]+)/deadline$#', ['QuizController', 'deadline']],

    ['GET',  '#^/api/documents$#', ['DocumentController', 'index']],
    ['POST', '#^/api/documents$#', ['DocumentController', 'store']],
    ['DELETE','#^/api/documents/([a-f0-9-]+)$#', ['DocumentController', 'destroy']],
    ['GET',  '#^/api/documents/([a-f0-9-]+)/signed-url$#', ['DocumentController', 'signedUrl']],

    ['GET',  '#^/api/preferences/birthday-mode$#', ['PreferenceController', 'get']],
    ['POST', '#^/api/preferences/birthday-mode$#', ['PreferenceController', 'set']],

    ['GET',  '#^/api/dashboard/stats$#', ['DashboardController', 'stats']],
    ['PATCH','#^/api/dashboard/stats$#', ['DashboardController', 'update']],

    ['GET',  '#^/api/timetable$#', ['TimetableController', 'index']],
    ['POST', '#^/api/timetable$#', ['TimetableController', 'store']],
    ['DELETE','#^/api/timetable/([a-f0-9-]+)$#', ['TimetableController', 'destroy']],

    ['GET',  '#^/api/progress$#', ['ProgressController', 'index']],
    ['POST', '#^/api/progress$#', ['ProgressController', 'upsert']],
    ['GET',  '#^/api/progress/summary$#', ['ProgressController', 'summary']],

    ['GET',  '#^/api/softwares$#', ['SoftwareController', 'index']],
    ['POST', '#^/api/softwares$#', ['SoftwareController', 'store']],
    ['PATCH','#^/api/softwares/([a-f0-9-]+)$#', ['SoftwareController', 'update']],
    ['DELETE','#^/api/softwares/([a-f0-9-]+)$#', ['SoftwareController', 'destroy']],

    ['GET',  '#^/api/certificates$#', ['CertificateController', 'index']],
    ['POST', '#^/api/certificates$#', ['CertificateController', 'store']],
    ['DELETE','#^/api/certificates/([a-f0-9-]+)$#', ['CertificateController', 'destroy']],
    ['GET',  '#^/api/certificates/([a-f0-9-]+)/file$#', ['CertificateController', 'file']],
    ['GET',  '#^/api/certificates/([a-f0-9-]+)/pdf$#', ['CertificateController', 'pdf']],

    ['POST', '#^/api/library/search-books$#', ['LibraryController', 'searchBooks']],
    ['POST', '#^/api/guides/search$#', ['GuideController', 'search']],
    ['POST', '#^/api/guides/article$#', ['GuideController', 'article']],
    ['POST', '#^/api/guides/study-guide$#', ['GuideController', 'studyGuide']],

    ['POST', '#^/api/sections$#', ['SectionController', 'store']],
    ['PATCH','#^/api/sections/([a-f0-9-]+)$#', ['SectionController', 'update']],
    ['DELETE','#^/api/sections/([a-f0-9-]+)$#', ['SectionController', 'destroy']],
    ['POST', '#^/api/sections/reorder$#', ['SectionController', 'reorder']],

    ['GET',  '#^/api/enrollments$#', ['EnrollmentController', 'mine']],
    ['POST', '#^/api/enrollments$#', ['EnrollmentController', 'enroll']],
    ['DELETE','#^/api/enrollments/([a-f0-9-]+)$#', ['EnrollmentController', 'unenroll']],

    ['GET',  '#^/api/submissions$#', ['SubmissionController', 'index']],
    ['GET',  '#^/api/submissions/([a-f0-9-]+)$#', ['SubmissionController', 'show']],
    ['POST', '#^/api/submissions/([a-f0-9-]+)/grade$#', ['SubmissionController', 'grade']],
    ['DELETE','#^/api/submissions/([a-f0-9-]+)$#', ['SubmissionController', 'destroy']],

    ['PATCH','#^/api/profile$#', ['ProfileController', 'update']],
    ['POST', '#^/api/profile/avatar$#', ['ProfileController', 'avatar']],

    ['GET',  '#^/api/lms-guides$#', ['GuideAssetController', 'list']],
    ['POST', '#^/api/lms-guides$#', ['GuideAssetController', 'upload']],
    ['DELETE','#^/api/lms-guides/([a-f0-9-]+)$#', ['GuideAssetController', 'destroy']],

    ['GET',  '#^/api/course-books$#', ['CourseBookController', 'list']],
    ['POST', '#^/api/course-books$#', ['CourseBookController', 'upload']],
    ['GET',  '#^/api/course-books/([a-f0-9-]+)/signed-url$#', ['CourseBookController', 'signedUrl']],
    ['DELETE','#^/api/course-books/([a-f0-9-]+)$#', ['CourseBookController', 'destroy']],

    ['GET',  '#^/api/course-guides$#', ['CourseGuideController', 'list']],
    ['POST', '#^/api/course-guides$#', ['CourseGuideController', 'upload']],
    ['GET',  '#^/api/course-guides/([a-f0-9-]+)/signed-url$#', ['CourseGuideController', 'signedUrl']],
    ['DELETE','#^/api/course-guides/([a-f0-9-]+)$#', ['CourseGuideController', 'destroy']],

    ['POST', '#^/api/users/([a-f0-9-]+)/reset-password$#', ['AdminController', 'resetPassword']],
    ['POST', '#^/api/users/([a-f0-9-]+)/impersonate$#', ['AdminController', 'impersonate']],

    ['GET',  '#^/api/feed/upcoming$#', ['FeedController', 'upcoming']],
    ['GET',  '#^/api/feed/today$#', ['FeedController', 'today']],

    ['POST', '#^/api/materials/upload-richtext$#', ['UploadController', 'richtext']],
];
