-- Create a security definer function to check if user has access to an engagement
-- Access is granted if:
-- 1. User is the creator of the engagement
-- 2. User is assigned to the engagement
-- 3. User is a partner or manager (they can see all engagements for oversight)

CREATE OR REPLACE FUNCTION public.has_engagement_access(_user_id uuid, _engagement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User is the creator
    SELECT 1 FROM public.engagements WHERE id = _engagement_id AND created_by = _user_id
    UNION
    -- User is assigned to the engagement
    SELECT 1 FROM public.engagement_assignments WHERE engagement_id = _engagement_id AND user_id = _user_id
    UNION
    -- User is a partner or manager (oversight role)
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('partner', 'manager')
  )
$$;

-- Drop existing policies on engagements table
DROP POLICY IF EXISTS "Authenticated users can view engagements" ON public.engagements;
DROP POLICY IF EXISTS "Authenticated users can create engagements" ON public.engagements;
DROP POLICY IF EXISTS "Authenticated users can update engagements" ON public.engagements;
DROP POLICY IF EXISTS "Partners and managers can delete engagements" ON public.engagements;

-- Create new policies for engagements based on access
CREATE POLICY "Users can view engagements they have access to"
ON public.engagements
FOR SELECT
USING (public.has_engagement_access(auth.uid(), id));

CREATE POLICY "Authenticated users can create engagements"
ON public.engagements
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update engagements they have access to"
ON public.engagements
FOR UPDATE
USING (public.has_engagement_access(auth.uid(), id));

CREATE POLICY "Partners and managers can delete engagements"
ON public.engagements
FOR DELETE
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

-- Update trial_balance_lines policies
DROP POLICY IF EXISTS "Authenticated users can view trial balance lines" ON public.trial_balance_lines;
DROP POLICY IF EXISTS "Authenticated users can create trial balance lines" ON public.trial_balance_lines;
DROP POLICY IF EXISTS "Authenticated users can update trial balance lines" ON public.trial_balance_lines;
DROP POLICY IF EXISTS "Partners and managers can delete trial balance lines" ON public.trial_balance_lines;

CREATE POLICY "Users can view trial balance lines for their engagements"
ON public.trial_balance_lines
FOR SELECT
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create trial balance lines for their engagements"
ON public.trial_balance_lines
FOR INSERT
WITH CHECK (auth.uid() = created_by AND public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update trial balance lines for their engagements"
ON public.trial_balance_lines
FOR UPDATE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete trial balance lines"
ON public.trial_balance_lines
FOR DELETE
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

-- Update risks policies
DROP POLICY IF EXISTS "Authenticated users can view risks" ON public.risks;
DROP POLICY IF EXISTS "Authenticated users can create risks" ON public.risks;
DROP POLICY IF EXISTS "Authenticated users can update risks" ON public.risks;
DROP POLICY IF EXISTS "Partners and managers can delete risks" ON public.risks;

CREATE POLICY "Users can view risks for their engagements"
ON public.risks
FOR SELECT
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create risks for their engagements"
ON public.risks
FOR INSERT
WITH CHECK (auth.uid() = created_by AND public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update risks for their engagements"
ON public.risks
FOR UPDATE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete risks"
ON public.risks
FOR DELETE
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

-- Update review_notes policies
DROP POLICY IF EXISTS "Authenticated users can view review notes" ON public.review_notes;
DROP POLICY IF EXISTS "Authenticated users can create review notes" ON public.review_notes;
DROP POLICY IF EXISTS "Authenticated users can update review notes" ON public.review_notes;
DROP POLICY IF EXISTS "Partners and managers can delete review notes" ON public.review_notes;

CREATE POLICY "Users can view review notes for their engagements"
ON public.review_notes
FOR SELECT
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create review notes for their engagements"
ON public.review_notes
FOR INSERT
WITH CHECK (auth.uid() = created_by AND public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update review notes for their engagements"
ON public.review_notes
FOR UPDATE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete review notes"
ON public.review_notes
FOR DELETE
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));

-- Update audit_procedures policies
DROP POLICY IF EXISTS "Authenticated users can view procedures" ON public.audit_procedures;
DROP POLICY IF EXISTS "Authenticated users can create procedures" ON public.audit_procedures;
DROP POLICY IF EXISTS "Authenticated users can update procedures" ON public.audit_procedures;
DROP POLICY IF EXISTS "Partners and managers can delete procedures" ON public.audit_procedures;

CREATE POLICY "Users can view procedures for their engagements"
ON public.audit_procedures
FOR SELECT
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create procedures for their engagements"
ON public.audit_procedures
FOR INSERT
WITH CHECK (auth.uid() = created_by AND public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update procedures for their engagements"
ON public.audit_procedures
FOR UPDATE
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Partners and managers can delete procedures"
ON public.audit_procedures
FOR DELETE
USING (public.has_role(auth.uid(), 'partner') OR public.has_role(auth.uid(), 'manager'));