-- =============================================
-- School Management System Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. Users Table (teachers, students, admin)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('teacher', 'student', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. Courses Table
-- =============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. Course Files Table (videos + attachments)
-- =============================================
CREATE TABLE course_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id),
    title VARCHAR(200) NOT NULL,
    file_type VARCHAR(10) CHECK (file_type IN ('video', 'pdf', 'document')),
    file_url TEXT NOT NULL,
    file_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. Enrollments Table
-- =============================================
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id),
    course_id UUID REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- =============================================
-- 5. Comments Table
-- =============================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES course_files(id),
    user_id UUID REFERENCES users(id),
    parent_id UUID REFERENCES comments(id),
    comment TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. Comment Likes Table
-- =============================================
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES comments(id),
    user_id UUID REFERENCES users(id),
    UNIQUE(comment_id, user_id)
);

-- =============================================
-- 7. Notifications Table (Real-time)
-- =============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Create Indexes for Performance
-- =============================================
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_files_course ON course_files(course_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_comments_file ON comments(file_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- =============================================
-- Sample Data for Testing
-- =============================================

-- Insert sample users
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@school.com', '$2b$10$exampleHash123', 'System Admin', 'admin'),
('john.teacher@school.com', '$2b$10$exampleHash456', 'John Smith', 'teacher'),
('sara.teacher@school.com', '$2b$10$exampleHash789', 'Sara Johnson', 'teacher'),
('mike.student@school.com', '$2b$10$exampleHash101', 'Mike Brown', 'student'),
('lisa.student@school.com', '$2b$10$exampleHash102', 'Lisa Wilson', 'student'),
('tom.student@school.com', '$2b$10$exampleHash103', 'Tom Davis', 'student');

-- Insert sample courses
INSERT INTO courses (teacher_id, title, description, is_published) VALUES
(
    (SELECT id FROM users WHERE email = 'john.teacher@school.com'),
    'Web Development Fundamentals',
    'Learn HTML, CSS, and JavaScript from scratch',
    true
),
(
    (SELECT id FROM users WHERE email = 'john.teacher@school.com'),
    'React.js Masterclass',
    'Build modern web applications with React',
    true
),
(
    (SELECT id FROM users WHERE email = 'sara.teacher@school.com'),
    'Python for Beginners',
    'Start your programming journey with Python',
    true
);

-- Insert sample course files
INSERT INTO course_files (course_id, title, file_type, file_url, file_order) VALUES
(
    (SELECT id FROM courses WHERE title = 'Web Development Fundamentals'),
    'Introduction to HTML',
    'video',
    '/videos/html-intro.mp4',
    1
),
(
    (SELECT id FROM courses WHERE title = 'Web Development Fundamentals'),
    'CSS Basics Tutorial',
    'video',
    '/videos/css-basics.mp4',
    2
),
(
    (SELECT id FROM courses WHERE title = 'Web Development Fundamentals'),
    'Course Materials PDF',
    'pdf',
    '/docs/course-materials.pdf',
    3
),
(
    (SELECT id FROM courses WHERE title = 'React.js Masterclass'),
    'React Components Overview',
    'video',
    '/videos/react-components.mp4',
    1
);

-- Insert sample enrollments
INSERT INTO enrollments (student_id, course_id) VALUES
(
    (SELECT id FROM users WHERE email = 'mike.student@school.com'),
    (SELECT id FROM courses WHERE title = 'Web Development Fundamentals')
),
(
    (SELECT id FROM users WHERE email = 'lisa.student@school.com'),
    (SELECT id FROM courses WHERE title = 'Web Development Fundamentals')
),
(
    (SELECT id FROM users WHERE email = 'tom.student@school.com'),
    (SELECT id FROM courses WHERE title = 'React.js Masterclass')
);

-- Insert sample comments
INSERT INTO comments (file_id, user_id, comment, likes) VALUES
(
    (SELECT id FROM course_files WHERE title = 'Introduction to HTML'),
    (SELECT id FROM users WHERE email = 'mike.student@school.com'),
    'Great introduction! Very clear explanations.',
    2
),
(
    (SELECT id FROM course_files WHERE title = 'Introduction to HTML'),
    (SELECT id FROM users WHERE email = 'lisa.student@school.com'),
    'Can someone explain the difference between div and span?',
    0
);

-- Insert sample comment replies
INSERT INTO comments (file_id, user_id, parent_id, comment, likes) VALUES
(
    (SELECT id FROM course_files WHERE title = 'Introduction to HTML'),
    (SELECT id FROM users WHERE email = 'tom.student@school.com'),
    (SELECT id FROM comments WHERE comment LIKE '%div and span%'),
    'div is block-level, span is inline. Hope that helps!',
    1
);

-- Insert sample comment likes
INSERT INTO comment_likes (comment_id, user_id) VALUES
(
    (SELECT id FROM comments WHERE comment LIKE '%Great introduction%'),
    (SELECT id FROM users WHERE email = 'lisa.student@school.com')
),
(
    (SELECT id FROM comments WHERE comment LIKE '%Great introduction%'),
    (SELECT id FROM users WHERE email = 'tom.student@school.com')
);

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message) VALUES
(
    (SELECT id FROM users WHERE email = 'john.teacher@school.com'),
    'New Comment on Your Course',
    'Mike Brown commented on "Introduction to HTML"'
),
(
    (SELECT id FROM users WHERE email = 'lisa.student@school.com'),
    'Reply to Your Question',
    'Tom Davis answered your question about div and span'
);

-- =============================================
-- Display sample data counts (optional)
-- =============================================
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM courses) as total_courses,
    (SELECT COUNT(*) FROM course_files) as total_files,
    (SELECT COUNT(*) FROM enrollments) as total_enrollments,
    (SELECT COUNT(*) FROM comments) as total_comments,
    (SELECT COUNT(*) FROM notifications) as total_notifications;