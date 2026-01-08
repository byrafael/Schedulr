-- Update existing class_sessions to set homeroom_id based on the class's grade
-- This migration script assigns each class session to the appropriate homeroom(s)

-- For grade-specific classes, assign to homerooms that have that grade
UPDATE class_sessions cs
INNER JOIN classes c ON cs.class_id = c.id
INNER JOIN homeroom_grades hg ON c.grade_id = hg.grade_id
SET cs.homeroom_id = hg.homeroom_id
WHERE c.grade_id IS NOT NULL 
  AND cs.homeroom_id IS NULL;

-- Note: For shared classes (c.grade_id IS NULL), we cannot automatically determine 
-- which homeroom they belong to without additional context. These will remain NULL 
-- and will need to be manually assigned or reassigned when moved in the UI.
-- The application will handle this going forward by setting homeroom_id when creating new sessions.
