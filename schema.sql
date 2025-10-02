-- QR Attendance System Database Schema
-- Drop existing tables if they exist
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS students;

-- Students table
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    class TEXT NOT NULL,
    qr_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Attendance records table
CREATE TABLE attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    attendance_time TIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_student_id ON students(student_id);
CREATE INDEX idx_student_class ON students(class);
CREATE INDEX idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_attendance_class ON attendance_records(class);

-- Create unique constraint to prevent duplicate attendance on same day
CREATE UNIQUE INDEX idx_unique_attendance ON attendance_records(student_id, class, attendance_date);

-- Insert sample data (optional - remove if not needed)
-- INSERT INTO students (student_id, student_name, class, qr_code) 
-- VALUES 
--     ('2021001', 'John Doe', 'SDF04', '{"name":"John Doe","id":"2021001","class":"SDF04"}'),
--     ('2021002', 'Jane Smith', 'IM2', '{"name":"Jane Smith","id":"2021002","class":"IM2"}'),
--     ('2021003', 'Bob Johnson', 'SP2', '{"name":"Bob Johnson","id":"2021003","class":"SP2"}');