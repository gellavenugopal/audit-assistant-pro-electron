-- PHASE 1: Add approval workflow columns to audit_procedures, review_notes, evidence_files
-- Also add lock enforcement triggers

-- =====================================================
-- 1. Add approval workflow columns to audit_procedures
-- =====================================================
ALTER TABLE public.audit_procedures
ADD COLUMN IF NOT EXISTS approval_stage text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS prepared_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS prepared_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS reviewed_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS approved_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS locked_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unlocked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS unlocked_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unlock_reason text NULL;

-- Add check constraint for approval_stage
ALTER TABLE public.audit_procedures
DROP CONSTRAINT IF EXISTS audit_procedures_approval_stage_check;
ALTER TABLE public.audit_procedures
ADD CONSTRAINT audit_procedures_approval_stage_check 
CHECK (approval_stage IN ('draft', 'prepared', 'reviewed', 'approved'));

-- =====================================================
-- 2. Add approval workflow columns to review_notes
-- =====================================================
ALTER TABLE public.review_notes
ADD COLUMN IF NOT EXISTS approval_stage text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS prepared_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS prepared_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS reviewed_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS approved_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS locked_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unlocked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS unlocked_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unlock_reason text NULL;

-- Add check constraint for approval_stage
ALTER TABLE public.review_notes
DROP CONSTRAINT IF EXISTS review_notes_approval_stage_check;
ALTER TABLE public.review_notes
ADD CONSTRAINT review_notes_approval_stage_check 
CHECK (approval_stage IN ('draft', 'prepared', 'reviewed', 'approved'));

-- =====================================================
-- 3. Add approval workflow columns to evidence_files
-- =====================================================
ALTER TABLE public.evidence_files
ADD COLUMN IF NOT EXISTS approval_stage text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS prepared_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS prepared_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS reviewed_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS approved_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS locked_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unlocked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS unlocked_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unlock_reason text NULL;

-- Add check constraint for approval_stage
ALTER TABLE public.evidence_files
DROP CONSTRAINT IF EXISTS evidence_files_approval_stage_check;
ALTER TABLE public.evidence_files
ADD CONSTRAINT evidence_files_approval_stage_check 
CHECK (approval_stage IN ('draft', 'prepared', 'reviewed', 'approved'));

-- =====================================================
-- 4. Create audit_trail table for logging workflow actions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value text NULL,
  new_value text NULL,
  reason text NULL,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb
);

-- Enable RLS on audit_trail
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_trail
CREATE POLICY "Authenticated users can insert audit trail"
ON public.audit_trail
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Partner and manager can view all audit trail"
ON public.audit_trail
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Users can view their own audit trail entries"
ON public.audit_trail
FOR SELECT
TO authenticated
USING (auth.uid() = performed_by);

-- =====================================================
-- 5. Create trigger function to enforce lock on updates
-- =====================================================
CREATE OR REPLACE FUNCTION public.enforce_approval_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  is_unlock_action boolean;
BEGIN
  -- Get the current user's role
  SELECT role INTO user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role 
      WHEN 'partner' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'senior' THEN 3 
      WHEN 'staff' THEN 4 
      WHEN 'viewer' THEN 5 
    END
  LIMIT 1;

  -- Check if this is an unlock action (locked changing from true to false with reason)
  is_unlock_action := OLD.locked = true AND NEW.locked = false AND NEW.unlock_reason IS NOT NULL AND NEW.unlock_reason != '';

  -- If record is locked and this is NOT an unlock action
  IF OLD.locked = true AND NOT is_unlock_action THEN
    -- Only partner/manager can modify locked records
    IF user_role NOT IN ('partner', 'manager') THEN
      RAISE EXCEPTION 'Cannot modify locked record. Only Partner/Manager can unlock with reason.';
    END IF;
  END IF;

  -- If this is an unlock action, verify it's a partner/manager
  IF is_unlock_action THEN
    IF user_role NOT IN ('partner', 'manager') THEN
      RAISE EXCEPTION 'Only Partner/Manager can unlock records.';
    END IF;
    -- Set unlock metadata
    NEW.unlocked_at := now();
    NEW.unlocked_by := auth.uid();
  END IF;

  -- Prevent staff from setting reviewed/approved stages
  IF user_role = 'staff' THEN
    IF NEW.approval_stage IN ('reviewed', 'approved') AND OLD.approval_stage NOT IN ('reviewed', 'approved') THEN
      RAISE EXCEPTION 'Staff cannot mark as reviewed or approved.';
    END IF;
  END IF;

  -- Prevent non-partner from approving
  IF NEW.approval_stage = 'approved' AND OLD.approval_stage != 'approved' THEN
    IF user_role NOT IN ('partner', 'manager') THEN
      RAISE EXCEPTION 'Only Partner or Manager can approve.';
    END IF;
  END IF;

  -- Auto-lock when approved
  IF NEW.approval_stage = 'approved' AND OLD.approval_stage != 'approved' THEN
    NEW.locked := true;
    NEW.locked_at := now();
    NEW.locked_by := auth.uid();
    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
  END IF;

  -- Set prepared metadata
  IF NEW.approval_stage = 'prepared' AND OLD.approval_stage != 'prepared' THEN
    NEW.prepared_at := now();
    NEW.prepared_by := auth.uid();
  END IF;

  -- Set reviewed metadata
  IF NEW.approval_stage = 'reviewed' AND OLD.approval_stage != 'reviewed' THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 6. Apply trigger to all three tables
-- =====================================================
DROP TRIGGER IF EXISTS enforce_approval_lock_trigger ON public.audit_procedures;
CREATE TRIGGER enforce_approval_lock_trigger
BEFORE UPDATE ON public.audit_procedures
FOR EACH ROW
EXECUTE FUNCTION public.enforce_approval_lock();

DROP TRIGGER IF EXISTS enforce_approval_lock_trigger ON public.review_notes;
CREATE TRIGGER enforce_approval_lock_trigger
BEFORE UPDATE ON public.review_notes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_approval_lock();

DROP TRIGGER IF EXISTS enforce_approval_lock_trigger ON public.evidence_files;
CREATE TRIGGER enforce_approval_lock_trigger
BEFORE UPDATE ON public.evidence_files
FOR EACH ROW
EXECUTE FUNCTION public.enforce_approval_lock();

-- =====================================================
-- 7. Add indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_procedures_approval_stage ON public.audit_procedures(approval_stage);
CREATE INDEX IF NOT EXISTS idx_audit_procedures_locked ON public.audit_procedures(locked);
CREATE INDEX IF NOT EXISTS idx_review_notes_approval_stage ON public.review_notes(approval_stage);
CREATE INDEX IF NOT EXISTS idx_review_notes_locked ON public.review_notes(locked);
CREATE INDEX IF NOT EXISTS idx_evidence_files_approval_stage ON public.evidence_files(approval_stage);
CREATE INDEX IF NOT EXISTS idx_evidence_files_locked ON public.evidence_files(locked);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON public.audit_trail(entity_type, entity_id);