-- MySQL schema for LMS (Supabase replacement)
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(32) UNIQUE NOT NULL
);

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(512),
  is_blocked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
  id CHAR(36) PRIMARY KEY,
  user_id VARCHAR(64),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(512),
  is_blocked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_roles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE dashboard_stats (
  id CHAR(36) PRIMARY KEY,
  total_activity INT DEFAULT 64,
  in_progress INT DEFAULT 8,
  completed INT DEFAULT 12,
  upcoming INT DEFAULT 14,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  subcategory VARCHAR(255),
  level VARCHAR(64),
  duration VARCHAR(64),
  mode VARCHAR(64),
  partner VARCHAR(255),
  description TEXT,
  overview TEXT,
  tuition VARCHAR(64),
  installments TINYINT(1) DEFAULT 0,
  accreditation VARCHAR(255),
  rating DECIMAL(4,2) DEFAULT 0,
  enrolled_students INT DEFAULT 0,
  learning_outcomes JSON,
  modules JSON,
  entry_requirements JSON,
  career_opportunities JSON,
  instructor VARCHAR(255),
  next_class VARCHAR(255),
  time_slot VARCHAR(255),
  status VARCHAR(32) DEFAULT 'active',
  grade VARCHAR(64),
  progress INT DEFAULT 0,
  quiz_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE course_sections (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE course_materials (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  section_id CHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(512) NOT NULL,
  file_type VARCHAR(128) NOT NULL,
  file_size BIGINT,
  order_index INT DEFAULT 0,
  is_hidden TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE SET NULL
);

CREATE TABLE enrollments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  status VARCHAR(32),
  role VARCHAR(32),
  progress INT,
  enrolled_at DATETIME,
  enrolled_by CHAR(36),
  enrollment_duration_days INT,
  expires_at DATETIME,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE assignments (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  course VARCHAR(255) NOT NULL,
  course_code VARCHAR(128) NOT NULL,
  due_date DATE,
  priority VARCHAR(32),
  hours_left INT,
  points INT,
  description TEXT,
  status VARCHAR(32),
  submitted_date DATE,
  grade VARCHAR(64),
  feedback TEXT,
  attempts INT DEFAULT 2,
  passing_marks INT,
  assessment_brief TEXT,
  unit_name VARCHAR(255),
  is_hidden TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE assignment_deadlines (
  id CHAR(36) PRIMARY KEY,
  assignment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  deadline DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (assignment_id, user_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE assignment_extra_attempts (
  id CHAR(36) PRIMARY KEY,
  assignment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  extra_attempts INT DEFAULT 1,
  granted_by CHAR(36),
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (assignment_id, user_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE assignment_submissions (
  id CHAR(36) PRIMARY KEY,
  assignment_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  file_path VARCHAR(512),
  status VARCHAR(32),
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  graded_at DATETIME,
  graded_by CHAR(36),
  marks_obtained INT,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE progress_tracking (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  item_type VARCHAR(64) NOT NULL,
  assignment_id CHAR(36),
  quiz_id CHAR(36),
  status VARCHAR(32),
  score INT,
  max_score INT,
  percentage DECIMAL(5,2),
  completed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE section_quizzes (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  section_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quiz_url VARCHAR(512) NOT NULL,
  due_date DATETIME,
  duration INT,
  is_hidden TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE
);

CREATE TABLE quiz_deadlines (
  id CHAR(36) PRIMARY KEY,
  quiz_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  deadline DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (quiz_id, user_id),
  FOREIGN KEY (quiz_id) REFERENCES section_quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE certificates (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  certificate_number VARCHAR(64) NOT NULL,
  issued_date DATETIME,
  completion_date DATETIME,
  generated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE lms_guides (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  guide_type VARCHAR(64),
  file_path VARCHAR(512),
  thumbnail_url VARCHAR(512),
  youtube_url VARCHAR(512),
  duration INT,
  uploaded_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE course_books (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(512) NOT NULL,
  cover_image_url VARCHAR(512),
  file_type VARCHAR(64),
  file_size BIGINT,
  uploaded_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE course_guides (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  guide_type VARCHAR(64),
  file_path VARCHAR(512),
  thumbnail_url VARCHAR(512),
  youtube_url VARCHAR(512),
  duration INT,
  uploaded_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE library_items (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(128),
  course_id CHAR(36),
  file_path VARCHAR(512),
  file_type VARCHAR(64),
  file_size BIGINT,
  downloads INT,
  is_public TINYINT(1) DEFAULT 1,
  tags JSON,
  uploaded_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
);

CREATE TABLE timetable (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  course_code VARCHAR(64) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  day_of_week VARCHAR(16) NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  instructor VARCHAR(255),
  room VARCHAR(255),
  notes TEXT,
  color VARCHAR(16),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE user_preferences (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  birthday_mode TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_documents (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  file_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE softwares (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(64),
  category VARCHAR(128),
  cover_image_url VARCHAR(512),
  download_url VARCHAR(512),
  uploaded_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE admin_audit_log (
  id CHAR(36) PRIMARY KEY,
  admin_id CHAR(36) NOT NULL,
  target_user_id CHAR(36),
  action VARCHAR(128) NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- seed roles and stats
INSERT INTO roles (name) VALUES ('admin'),('student'),('teacher'),('non_editing_teacher'),('user');
INSERT INTO dashboard_stats (id,total_activity,in_progress,completed,upcoming) VALUES (UUID(),64,8,12,14);

-- seed admin user (email: hashirsaqib2008@gmail.com, password: 5413881ssb)
SET @admin_user_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO users (id, email, password_hash, full_name, is_blocked)
VALUES (@admin_user_id, 'hashirsaqib2008@gmail.com', '$2y$10$Rhvmc9wuO6uiknWDAgfUteanwBhwwfjBd/Yyxch7sJyHW8e7LFPMG', 'Administrator', 0);
INSERT INTO profiles (id, user_id, email, full_name)
VALUES (@admin_user_id, 'ADMIN001', 'hashirsaqib2008@gmail.com', 'Administrator');
INSERT INTO user_roles (id, user_id, role_id)
VALUES (UUID(), @admin_user_id, (SELECT id FROM roles WHERE name = 'admin'));
