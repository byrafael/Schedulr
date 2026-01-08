/*
|--------------------------------------------------------------------------
| Lookup Tables
|--------------------------------------------------------------------------
| Static or semi-static reference data used for normalization and to avoid ENUMs.
*/

/** Sections: School sections like Primary, Secondary, etc. */
CREATE TABLE sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Grades: Each section’s grades, e.g. Grade 1, Grade 2 */
CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_id INT NOT NULL,
  name VARCHAR(20) NOT NULL,
  UNIQUE (section_id, name),
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Semesters: Academic periods with start/end dates */
CREATE TABLE semesters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CHECK (start_date < end_date),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Teacher roles lookup: roles like 'Lead Teacher', 'Assistant', etc. */
CREATE TABLE teacher_roles_lookup (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Room types: e.g. Classroom, Lab, Oasis, Field */
CREATE TABLE room_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Duty types: e.g. Supervision, Invigilation, etc. */
CREATE TABLE duty_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/*
|--------------------------------------------------------------------------
| Core Entities
|--------------------------------------------------------------------------
| Main entities representing people, rooms, time blocks, and other critical components.
*/

/** Teachers: Staff members who teach classes or perform duties */
CREATE TABLE teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Teacher roles: Many-to-many linking teachers to their roles */
CREATE TABLE teacher_roles (
  teacher_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (teacher_id, role_id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES teacher_roles_lookup(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Homerooms: Groupings of students under a teacher for pastoral care */
CREATE TABLE homerooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  section_id INT NOT NULL,
  teacher_id INT NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Homeroom-grades: Many-to-many linking homerooms to grades */
CREATE TABLE homeroom_grades (
  homeroom_id INT NOT NULL,
  grade_id INT NOT NULL,
  PRIMARY KEY (homeroom_id, grade_id),
  FOREIGN KEY (homeroom_id) REFERENCES homerooms(id) ON DELETE CASCADE,
  FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Students: Each student assigned to a grade, homeroom, and optionally A-Level groups */
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade_id INT NOT NULL,
  homeroom_id INT NOT NULL,
  is_as_level BOOLEAN NOT NULL DEFAULT FALSE,
  is_a_level BOOLEAN NOT NULL DEFAULT FALSE,
  a_group_id INT NULL,
  FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
  FOREIGN KEY (homeroom_id) REFERENCES homerooms(id) ON DELETE CASCADE,
  FOREIGN KEY (a_group_id) REFERENCES a_groups(id) ON DELETE SET NULL,
  INDEX idx_students_grade_id (grade_id),
  INDEX idx_students_homeroom_id (homeroom_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** A-Level Groups: Specialized groups for A-level students per homeroom and semester */
CREATE TABLE a_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  homeroom_id INT NOT NULL,
  semester_id INT NOT NULL,
  FOREIGN KEY (homeroom_id) REFERENCES homerooms(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE (name, homeroom_id, semester_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Student A-Level Groups: Many-to-many linking students to A-level groups */
CREATE TABLE student_a_groups (
  student_id INT NOT NULL,
  a_group_id INT NOT NULL,
  PRIMARY KEY (student_id, a_group_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (a_group_id) REFERENCES a_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Rooms: Physical locations where classes or duties occur */
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  type_id INT NOT NULL,
  location VARCHAR(100) NOT NULL,
  building VARCHAR(100) NOT NULL,
  FOREIGN KEY (type_id) REFERENCES room_types(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Blocks: Scheduled time slots within semesters */
CREATE TABLE blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_early BOOLEAN NOT NULL DEFAULT FALSE,
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  semester_id INT NOT NULL,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE (name, semester_id),
  CHECK (start_time < end_time),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Classes: Academic courses offered per section/grade/semester */
CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  section_id INT NOT NULL,
  grade_id INT NULL,
  semester_id INT NOT NULL,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE (code, grade_id, semester_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/*
|--------------------------------------------------------------------------
| Scheduling & Assignments
|--------------------------------------------------------------------------
| Tables managing scheduled class sessions, teachers assigned, duties, and templates.
*/

/** Class sessions: Instances of classes scheduled in blocks on specific days */
CREATE TABLE class_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  block_id INT NOT NULL,
  day_of_week TINYINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Mon..5=Fri
  room_id INT NOT NULL,
  semester_id INT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE (block_id, day_of_week, room_id, semester_id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Teachers assigned to class sessions with roles */
CREATE TABLE class_session_teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_session_id INT NOT NULL,
  teacher_id INT NOT NULL,
  role VARCHAR(50) NOT NULL,
  FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/*
| Prevent a teacher being assigned twice to the same session
| (does not prevent double booking across sessions at same time)
*/
CREATE UNIQUE INDEX idx_teacher_schedule_unique ON class_session_teachers(teacher_id, class_session_id);

/** Duties: Additional teacher responsibilities like supervision */
CREATE TABLE duties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  block_id INT NOT NULL,
  day_of_week TINYINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  duty_type_id INT NOT NULL,
  room_id INT NOT NULL,
  semester_id INT NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (duty_type_id) REFERENCES duty_types(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

/** Schedule templates: Predefined templates to apply to semesters or schedules */
CREATE TABLE schedule_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  semester_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

/** Template entries: Links between schedule templates and class sessions */
CREATE TABLE template_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_template_id INT NOT NULL,
  class_session_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_template_id) REFERENCES schedule_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (class_session_id) REFERENCES class_sessions(id) ON DELETE CASCADE
);
