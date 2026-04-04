-- Add trigger to automatically update project progress when task status changes
CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_tasks INT;
  completed_tasks INT;
  progress_percent DECIMAL(5,2);
BEGIN
  -- Only update if this is a project task
  IF NEW.project_id IS NOT NULL THEN
    -- Count total and completed tasks for this project
    SELECT COUNT(*), COUNT(CASE WHEN status = 'done' THEN 1 END)
    INTO total_tasks, completed_tasks
    FROM tasks
    WHERE project_id = NEW.project_id;

    -- Calculate progress percentage
    IF total_tasks > 0 THEN
      progress_percent := (completed_tasks::DECIMAL(5,2) / total_tasks::DECIMAL(5,2)) * 100;
    ELSE
      progress_percent := 0.00;
    END IF;

    -- Update project progress
    UPDATE projects
    SET progress = progress_percent, updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_project_progress ON tasks;

-- Create trigger for task status updates
CREATE TRIGGER trigger_update_project_progress
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_progress();

-- Also trigger on insert (in case tasks with 'done' status are created)
DROP TRIGGER IF EXISTS trigger_update_project_progress_insert ON tasks;
CREATE TRIGGER trigger_update_project_progress_insert
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_progress();
