-- STEP 1: Add workpaper fields to standard_procedures (templates)
-- These columns store checklist items, evidence requirements, and conclusion prompts for templates

-- Add checklist_items JSONB column with empty array default
ALTER TABLE public.standard_procedures 
ADD COLUMN IF NOT EXISTS checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add evidence_requirements JSONB column with empty array default
ALTER TABLE public.standard_procedures 
ADD COLUMN IF NOT EXISTS evidence_requirements jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add conclusion_prompt text column (nullable)
ALTER TABLE public.standard_procedures 
ADD COLUMN IF NOT EXISTS conclusion_prompt text NULL;

-- Add default_status text column (optional default status when creating from template)
ALTER TABLE public.standard_procedures 
ADD COLUMN IF NOT EXISTS default_status text NULL;

-- STEP 2: Add workpaper fields to audit_procedures (instances)
-- These columns store the copied checklist/evidence from templates plus completion tracking

-- Add template_id to track which template was used (nullable for backward compatibility)
ALTER TABLE public.audit_procedures 
ADD COLUMN IF NOT EXISTS template_id uuid NULL;

-- Add checklist_items JSONB column with empty array default
ALTER TABLE public.audit_procedures 
ADD COLUMN IF NOT EXISTS checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add evidence_requirements JSONB column with empty array default  
ALTER TABLE public.audit_procedures 
ADD COLUMN IF NOT EXISTS evidence_requirements jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add conclusion_prompt text column (nullable)
ALTER TABLE public.audit_procedures 
ADD COLUMN IF NOT EXISTS conclusion_prompt text NULL;

-- Add foreign key constraint for template_id (soft reference, allows NULL)
-- We use ON DELETE SET NULL so deleting a template doesn't break existing procedures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'audit_procedures_template_id_fkey'
    AND table_name = 'audit_procedures'
  ) THEN
    ALTER TABLE public.audit_procedures 
    ADD CONSTRAINT audit_procedures_template_id_fkey 
    FOREIGN KEY (template_id) 
    REFERENCES public.standard_procedures(id) 
    ON DELETE SET NULL;
  END IF;
END
$$;

-- Add index for faster template usage lookups
CREATE INDEX IF NOT EXISTS idx_audit_procedures_template_id ON public.audit_procedures(template_id);

-- Add comments for documentation
COMMENT ON COLUMN public.standard_procedures.checklist_items IS 'Array of checklist items: [{id, text, required, order}]';
COMMENT ON COLUMN public.standard_procedures.evidence_requirements IS 'Array of evidence requirements: [{id, label, required, order, allowed_types, wp_ref_hint}]';
COMMENT ON COLUMN public.standard_procedures.conclusion_prompt IS 'Template prompt for conclusion documentation';
COMMENT ON COLUMN public.standard_procedures.default_status IS 'Default status when creating procedure from template';

COMMENT ON COLUMN public.audit_procedures.template_id IS 'Reference to the template used to create this procedure';
COMMENT ON COLUMN public.audit_procedures.checklist_items IS 'Instance checklist with completion: [{id, text, required, order, done, done_by, done_at}]';
COMMENT ON COLUMN public.audit_procedures.evidence_requirements IS 'Instance evidence reqs with status: [{id, label, required, order, allowed_types, wp_ref_hint, satisfied}]';
COMMENT ON COLUMN public.audit_procedures.conclusion_prompt IS 'Copied conclusion prompt from template';