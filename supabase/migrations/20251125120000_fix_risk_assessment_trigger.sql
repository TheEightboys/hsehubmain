-- ============================================
-- FIX RISK ASSESSMENTS TRIGGER
-- Fixes the auto_trigger_training_from_risk function
-- that was using incorrect column name 'due_date'
-- ============================================

-- Drop and recreate the trigger function with correct column names
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
        -- FIXED: Added 'assigned_date' back as it's required (NOT NULL)
        INSERT INTO public.training_records (
          company_id,
          employee_id,
          training_type_id,
          status,
          assigned_date,
          expiry_date
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Risk assessments trigger fixed successfully!';
    RAISE NOTICE '   - Fixed auto_trigger_training_from_risk function';
    RAISE NOTICE '   - Changed due_date to expiry_date';
    RAISE NOTICE '   - Removed assigned_date column';
END $$;
