-- Add new fields for simple and legal summaries with examples
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS simple_summary TEXT,
ADD COLUMN IF NOT EXISTS legal_summary TEXT,
ADD COLUMN IF NOT EXISTS todo_simple TEXT,
ADD COLUMN IF NOT EXISTS todo_legal TEXT;

-- Note: Keeping what_is_it and what_to_do for backward compatibility
-- New analyses will populate simple_summary, legal_summary, todo_simple, todo_legal

