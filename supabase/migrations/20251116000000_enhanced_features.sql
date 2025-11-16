-- ============================================
-- HSE HUB - ENHANCED FEATURES MIGRATION
-- ============================================
-- This migration adds:
-- 1. Notifications system for real-time alerts
-- 2. Database triggers for automated workflows
-- 3. Improved indexes for better performance
-- 4. Additional helper functions
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    category TEXT NOT NULL CHECK (category IN ('task', 'training', 'audit', 'incident', 'measure', 'risk', 'system')),
    related_id UUID,
    related_table TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_training_records_employee_id ON public.training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_records_status ON public.training_records(status);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_company_id ON public.risk_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON public.risk_assessments(risk_level);

CREATE INDEX IF NOT EXISTS idx_incidents_company_id ON public.incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON public.incidents(incident_date);

CREATE INDEX IF NOT EXISTS idx_measures_company_id ON public.measures(company_id);
CREATE INDEX IF NOT EXISTS idx_measures_status ON public.measures(status);

-- ============================================
-- NOTIFICATION HELPER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_company_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_category TEXT,
  p_related_id UUID DEFAULT NULL,
  p_related_table TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    company_id,
    user_id,
    title,
    message,
    type,
    category,
    related_id,
    related_table
  ) VALUES (
    p_company_id,
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_category,
    p_related_id,
    p_related_table
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AUTOMATED WORKFLOW TRIGGERS
-- ============================================

-- 1. Auto-create training requirements when high-risk assessment is created
CREATE OR REPLACE FUNCTION auto_trigger_training_from_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_training_type_id UUID;
  v_employee_record RECORD;
BEGIN
  -- Only trigger for high or critical risk levels
  IF NEW.risk_level IN ('high', 'critical') THEN
    
    -- Find relevant training type (you may need to customize this logic)
    SELECT id INTO v_training_type_id
    FROM public.training_types
    WHERE company_id = NEW.company_id
    AND name ILIKE '%safety%'
    LIMIT 1;
    
    IF v_training_type_id IS NOT NULL THEN
      -- Get all employees in the affected department
      FOR v_employee_record IN 
        SELECT e.id, e.user_id
        FROM public.employees e
        WHERE e.company_id = NEW.company_id
        AND (e.department_id = NEW.department_id OR NEW.department_id IS NULL)
        AND e.is_active = true
      LOOP
        -- Create training record if it doesn't exist
        INSERT INTO public.training_records (
          company_id,
          employee_id,
          training_type_id,
          status,
          assigned_date,
          due_date
        )
        SELECT
          NEW.company_id,
          v_employee_record.id,
          v_training_type_id,
          'assigned',
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '30 days'
        WHERE NOT EXISTS (
          SELECT 1 FROM public.training_records
          WHERE employee_id = v_employee_record.id
          AND training_type_id = v_training_type_id
          AND status IN ('assigned', 'in_progress')
        );
        
        -- Create notification
        IF v_employee_record.user_id IS NOT NULL THEN
          PERFORM create_notification(
            NEW.company_id,
            v_employee_record.user_id,
            'New Training Assigned',
            'You have been assigned mandatory safety training due to a ' || NEW.risk_level || ' risk assessment.',
            'warning',
            'training',
            NEW.id,
            'risk_assessments'
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_training_from_risk
  AFTER INSERT ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION auto_trigger_training_from_risk();

-- 2. Auto-create task when audit finding is marked with deficiencies
CREATE OR REPLACE FUNCTION auto_create_task_from_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_task_id UUID;
  v_admin_user_id UUID;
BEGIN
  -- Only trigger if deficiencies are found
  IF NEW.deficiencies_found > 0 AND (OLD.deficiencies_found IS NULL OR OLD.deficiencies_found = 0) THEN
    
    -- Find a company admin to assign the task to
    SELECT ur.user_id INTO v_admin_user_id
    FROM public.user_roles ur
    WHERE ur.company_id = NEW.company_id
    AND ur.role = 'company_admin'
    LIMIT 1;
    
    -- Create task
    INSERT INTO public.tasks (
      company_id,
      title,
      description,
      status,
      priority,
      due_date,
      assigned_to,
      created_by
    ) VALUES (
      NEW.company_id,
      'Audit Finding: ' || NEW.title,
      'Address deficiencies found in audit. Findings: ' || COALESCE(NEW.findings, 'See audit details'),
      'pending',
      'high',
      CURRENT_DATE + INTERVAL '7 days',
      v_admin_user_id,
      v_admin_user_id
    ) RETURNING id INTO v_task_id;
    
    -- Create notification
    IF v_admin_user_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.company_id,
        v_admin_user_id,
        'New Task from Audit',
        NEW.deficiencies_found || ' deficiencies found in audit: ' || NEW.title,
        'warning',
        'audit',
        v_task_id,
        'tasks'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_task_from_audit
  AFTER INSERT OR UPDATE ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_task_from_audit();

-- 3. Auto-assign measures to employees based on activity assignments
CREATE OR REPLACE FUNCTION auto_assign_measures_to_employees()
RETURNS TRIGGER AS $$
DECLARE
  v_measure_record RECORD;
  v_employee_record RECORD;
BEGIN
  -- When a new measure is created linked to an activity group
  IF TG_OP = 'INSERT' AND NEW.activity_group_id IS NOT NULL THEN
    
    -- Find all employees assigned to this activity group
    FOR v_employee_record IN
      SELECT DISTINCT e.id, e.user_id
      FROM public.employees e
      INNER JOIN public.employee_activity_assignments eaa ON eaa.employee_id = e.id
      WHERE eaa.activity_group_id = NEW.activity_group_id
      AND e.company_id = NEW.company_id
      AND e.is_active = true
    LOOP
      -- Create notification for employee
      IF v_employee_record.user_id IS NOT NULL THEN
        PERFORM create_notification(
          NEW.company_id,
          v_employee_record.user_id,
          'New Safety Measure Assigned',
          'A new safety measure has been assigned: ' || NEW.title,
          'info',
          'measure',
          NEW.id,
          'measures'
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_assign_measures
  AFTER INSERT ON public.measures
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_measures_to_employees();

-- 4. Notify on overdue tasks
CREATE OR REPLACE FUNCTION notify_overdue_tasks()
RETURNS void AS $$
DECLARE
  v_task_record RECORD;
BEGIN
  FOR v_task_record IN
    SELECT t.id, t.company_id, t.assigned_to, t.title, t.due_date
    FROM public.tasks t
    WHERE t.status IN ('pending', 'in_progress')
    AND t.due_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_id = t.id
      AND n.related_table = 'tasks'
      AND n.category = 'task'
      AND n.title LIKE '%Overdue%'
      AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
    )
  LOOP
    IF v_task_record.assigned_to IS NOT NULL THEN
      PERFORM create_notification(
        v_task_record.company_id,
        v_task_record.assigned_to,
        'Overdue Task',
        'Task "' || v_task_record.title || '" was due on ' || v_task_record.due_date::TEXT,
        'error',
        'task',
        v_task_record.id,
        'tasks'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Notify on expiring training
CREATE OR REPLACE FUNCTION notify_expiring_training()
RETURNS void AS $$
DECLARE
  v_training_record RECORD;
BEGIN
  FOR v_training_record IN
    SELECT tr.id, tr.company_id, e.user_id, tt.name as training_name, tr.expiry_date
    FROM public.training_records tr
    INNER JOIN public.employees e ON e.id = tr.employee_id
    INNER JOIN public.training_types tt ON tt.id = tr.training_type_id
    WHERE tr.status = 'completed'
    AND tr.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_id = tr.id
      AND n.related_table = 'training_records'
      AND n.category = 'training'
      AND n.title LIKE '%Expiring%'
      AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    )
  LOOP
    IF v_training_record.user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_training_record.company_id,
        v_training_record.user_id,
        'Training Expiring Soon',
        'Your "' || v_training_record.training_name || '" training will expire on ' || v_training_record.expiry_date::TEXT,
        'warning',
        'training',
        v_training_record.id,
        'training_records'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTIONS FOR REPORTING
-- ============================================

-- Get company compliance score
CREATE OR REPLACE FUNCTION get_company_compliance_score(p_company_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_audits INTEGER;
  v_completed_audits INTEGER;
  v_completed_tasks INTEGER;
  v_total_tasks INTEGER;
  v_completed_training INTEGER;
  v_total_training INTEGER;
  v_compliance_score NUMERIC;
BEGIN
  -- Count audits
  SELECT COUNT(*) INTO v_total_audits
  FROM public.audits WHERE company_id = p_company_id;
  
  SELECT COUNT(*) INTO v_completed_audits
  FROM public.audits WHERE company_id = p_company_id AND status = 'completed';
  
  -- Count tasks
  SELECT COUNT(*) INTO v_total_tasks
  FROM public.tasks WHERE company_id = p_company_id;
  
  SELECT COUNT(*) INTO v_completed_tasks
  FROM public.tasks WHERE company_id = p_company_id AND status = 'completed';
  
  -- Count training
  SELECT COUNT(*) INTO v_total_training
  FROM public.training_records WHERE company_id = p_company_id;
  
  SELECT COUNT(*) INTO v_completed_training
  FROM public.training_records WHERE company_id = p_company_id AND status = 'completed';
  
  -- Calculate weighted compliance score
  v_compliance_score := 0;
  
  IF v_total_audits > 0 THEN
    v_compliance_score := v_compliance_score + (v_completed_audits::NUMERIC / v_total_audits * 40);
  ELSE
    v_compliance_score := v_compliance_score + 40; -- Full score if no audits
  END IF;
  
  IF v_total_tasks > 0 THEN
    v_compliance_score := v_compliance_score + (v_completed_tasks::NUMERIC / v_total_tasks * 30);
  ELSE
    v_compliance_score := v_compliance_score + 30;
  END IF;
  
  IF v_total_training > 0 THEN
    v_compliance_score := v_compliance_score + (v_completed_training::NUMERIC / v_total_training * 30);
  ELSE
    v_compliance_score := v_compliance_score + 30;
  END IF;
  
  RETURN ROUND(v_compliance_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.notifications IS 'Real-time notifications for users about tasks, training, incidents, and other events';
COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications programmatically';
COMMENT ON FUNCTION auto_trigger_training_from_risk IS 'Automatically creates training requirements when high/critical risk assessments are created';
COMMENT ON FUNCTION auto_create_task_from_audit IS 'Automatically creates tasks when audit deficiencies are found';
COMMENT ON FUNCTION auto_assign_measures_to_employees IS 'Automatically notifies employees when measures are assigned to their activity groups';
COMMENT ON FUNCTION notify_overdue_tasks IS 'Creates notifications for overdue tasks (should be called daily via cron job)';
COMMENT ON FUNCTION notify_expiring_training IS 'Creates notifications for expiring training certifications (should be called daily via cron job)';
COMMENT ON FUNCTION get_company_compliance_score IS 'Calculates a weighted compliance score (0-100) based on audits, tasks, and training completion';
