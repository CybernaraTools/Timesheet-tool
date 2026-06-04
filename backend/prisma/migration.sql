-- ============================================================
-- TIMESHEET PORTAL — Many-to-Many Manager Assignment Migration
-- ============================================================

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS public.timesheet_entry_managers (
  entry_id    UUID NOT NULL REFERENCES public.timesheet_entries(id) ON DELETE CASCADE,
  manager_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, manager_id)
);

-- 2. Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_timesheet_entry_managers_mgr ON public.timesheet_entry_managers(manager_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entry_managers_entry ON public.timesheet_entry_managers(entry_id);

-- 3. Enable RLS on junction table
ALTER TABLE public.timesheet_entry_managers ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for junction table
CREATE POLICY entry_managers_manager_select ON public.timesheet_entry_managers
  FOR SELECT USING (auth.uid() = manager_id);

CREATE POLICY entry_managers_employee_all ON public.timesheet_entry_managers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.timesheet_entries
      WHERE id = entry_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timesheet_entries
      WHERE id = entry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY entry_managers_admin_all ON public.timesheet_entry_managers
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- 5. Update timesheet entries manager RLS policy
-- Drop old policy
DROP POLICY IF EXISTS entries_manager_team ON public.timesheet_entries;

-- Recreate with expanded check (direct reports OR assigned entries)
CREATE POLICY entries_manager_team ON public.timesheet_entries
  FOR ALL USING (
    public.current_user_role() = 'manager'
    AND (
      user_id IN (
        SELECT id FROM public.users WHERE manager_id = auth.uid()
      )
      OR
      id IN (
        SELECT entry_id FROM public.timesheet_entry_managers WHERE manager_id = auth.uid()
      )
    )
  );

-- 6. Update edit requests manager RLS policy
-- Drop old policy
DROP POLICY IF EXISTS edit_req_manager ON public.edit_requests;

-- Recreate with expanded check
CREATE POLICY edit_req_manager ON public.edit_requests
  FOR ALL USING (
    public.current_user_role() = 'manager'
    AND entry_id IN (
      SELECT id FROM public.timesheet_entries
      WHERE (
        user_id IN (
          SELECT id FROM public.users WHERE manager_id = auth.uid()
        )
        OR
        id IN (
          SELECT entry_id FROM public.timesheet_entry_managers WHERE manager_id = auth.uid()
        )
      )
    )
  );

-- 7. Update timesheet_bulk_submit SQL function
CREATE OR REPLACE FUNCTION public.timesheet_bulk_submit(
  p_tasks JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id   UUID  := auth.uid();
  v_task      JSONB;
  v_entry_id  UUID;
  v_ids       UUID[] := '{}';
  v_count     INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF jsonb_typeof(p_tasks) <> 'array' THEN
    RAISE EXCEPTION 'p_tasks must be a JSON array';
  END IF;

  v_count := jsonb_array_length(p_tasks);
  IF v_count = 0 THEN
    RAISE EXCEPTION 'p_tasks must contain at least one task';
  END IF;

  PERFORM set_config('app.current_user_id', v_user_id::TEXT, true);

  FOR v_task IN SELECT * FROM jsonb_array_elements(p_tasks)
  LOOP
    IF v_task->>'work_date'     IS NULL OR
       v_task->>'category_id'   IS NULL OR
       v_task->>'task_title'    IS NULL OR
       v_task->>'start_time'    IS NULL OR
       v_task->>'end_time'      IS NULL OR
       v_task->>'output_status' IS NULL OR
       v_task->'manager_ids'    IS NULL OR
       jsonb_typeof(v_task->'manager_ids') <> 'array' OR
       jsonb_array_length(v_task->'manager_ids') = 0
    THEN
      RAISE EXCEPTION 'Each task must include work_date, category_id, task_title, start_time, end_time, output_status, and a non-empty manager_ids array. Got: %', v_task;
    END IF;

    IF (v_task->>'start_time')::TIME >= (v_task->>'end_time')::TIME THEN
      RAISE EXCEPTION 'start_time must be before end_time for task: %', v_task->>'task_title';
    END IF;

    INSERT INTO public.timesheet_entries (
      user_id,
      work_date,
      client_id,
      category_id,
      task_title,
      description,
      start_time,
      end_time,
      output_status,
      comment,
      is_locked
    )
    VALUES (
      v_user_id,
      (v_task->>'work_date')::DATE,
      NULLIF(v_task->>'client_id', '')::UUID,
      (v_task->>'category_id')::UUID,
      v_task->>'task_title',
      v_task->>'description',
      (v_task->>'start_time')::TIME,
      (v_task->>'end_time')::TIME,
      (v_task->>'output_status')::output_status,
      v_task->>'comment',
      true
    )
    RETURNING id INTO v_entry_id;

    -- Insert assigned managers for this entry
    DECLARE
      v_manager_id UUID;
    BEGIN
      FOR v_manager_id IN
        SELECT (jsonb_array_elements_text(v_task->'manager_ids'))::UUID
      LOOP
        -- Verify target manager exists and has role 'manager'
        IF NOT EXISTS (
          SELECT 1 FROM public.users WHERE id = v_manager_id AND role = 'manager'
        ) THEN
          RAISE EXCEPTION 'Target user % is not a manager.', v_manager_id;
        END IF;

        INSERT INTO public.timesheet_entry_managers (entry_id, manager_id)
        VALUES (v_entry_id, v_manager_id);
      END LOOP;
    END;

    v_ids := array_append(v_ids, v_entry_id);
  END LOOP;

  RETURN to_jsonb(v_ids);
END;
$$;
