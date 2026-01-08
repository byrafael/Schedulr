-- Add homeroom_id column to class_sessions table
ALTER TABLE class_sessions 
ADD COLUMN homeroom_id INT NULL AFTER semester_id,
ADD CONSTRAINT fk_class_sessions_homeroom 
  FOREIGN KEY (homeroom_id) REFERENCES homerooms(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_class_sessions_homeroom_id ON class_sessions(homeroom_id);
