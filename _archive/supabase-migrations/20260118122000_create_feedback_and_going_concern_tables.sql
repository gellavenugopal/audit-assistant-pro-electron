-- =====================================================
-- GOING CONCERN TABLES
-- =====================================================

CREATE TABLE public.going_concern_workpapers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES public.audit_procedures(id) ON DELETE SET NULL,
  chapter_no TEXT DEFAULT '4.1',
  topic TEXT DEFAULT 'Going Concern',
  conclusion TEXT,
  status TEXT DEFAULT 'draft',
  prepared_by uuid,
  prepared_at TIMESTAMPTZ,
  reviewed_by uuid,
  reviewed_at TIMESTAMPTZ,
  approved_by uuid,
  approved_at TIMESTAMPTZ,
  created_by uuid NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engagement_id)
);

CREATE TABLE public.going_concern_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id uuid NOT NULL REFERENCES public.going_concern_workpapers(id) ON DELETE CASCADE,
  section_number TEXT,
  item_number TEXT,
  description TEXT,
  findings TEXT,
  working TEXT,
  annexure_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gc_annexure_net_worth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id uuid NOT NULL REFERENCES public.going_concern_workpapers(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gc_annexure_profitability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id uuid NOT NULL REFERENCES public.going_concern_workpapers(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gc_annexure_borrowings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id uuid NOT NULL REFERENCES public.going_concern_workpapers(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gc_annexure_cash_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id uuid NOT NULL REFERENCES public.going_concern_workpapers(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.gc_annexure_ratios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workpaper_id uuid NOT NULL REFERENCES public.going_concern_workpapers(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.going_concern_workpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.going_concern_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_annexure_net_worth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_annexure_profitability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_annexure_borrowings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_annexure_cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gc_annexure_ratios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view going concern workpapers for accessible engagements"
ON public.going_concern_workpapers FOR SELECT TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can create going concern workpapers for accessible engagements"
ON public.going_concern_workpapers FOR INSERT TO authenticated
WITH CHECK (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update going concern workpapers for accessible engagements"
ON public.going_concern_workpapers FOR UPDATE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can delete going concern workpapers for accessible engagements"
ON public.going_concern_workpapers FOR DELETE TO authenticated
USING (public.has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can view going concern checklist items for accessible engagements"
ON public.going_concern_checklist_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = going_concern_checklist_items.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can manage going concern checklist items for accessible engagements"
ON public.going_concern_checklist_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = going_concern_checklist_items.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = going_concern_checklist_items.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can view going concern annexures for accessible engagements"
ON public.gc_annexure_net_worth FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_net_worth.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can manage going concern annexures for accessible engagements"
ON public.gc_annexure_net_worth FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_net_worth.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_net_worth.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can view going concern profitability annexures for accessible engagements"
ON public.gc_annexure_profitability FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_profitability.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can manage going concern profitability annexures for accessible engagements"
ON public.gc_annexure_profitability FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_profitability.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_profitability.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can view going concern borrowings annexures for accessible engagements"
ON public.gc_annexure_borrowings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_borrowings.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can manage going concern borrowings annexures for accessible engagements"
ON public.gc_annexure_borrowings FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_borrowings.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_borrowings.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can view going concern cash flow annexures for accessible engagements"
ON public.gc_annexure_cash_flows FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_cash_flows.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can manage going concern cash flow annexures for accessible engagements"
ON public.gc_annexure_cash_flows FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_cash_flows.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_cash_flows.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can view going concern ratios annexures for accessible engagements"
ON public.gc_annexure_ratios FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_ratios.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE POLICY "Users can manage going concern ratios annexures for accessible engagements"
ON public.gc_annexure_ratios FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_ratios.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.going_concern_workpapers w
    WHERE w.id = gc_annexure_ratios.workpaper_id
      AND public.has_engagement_access(auth.uid(), w.engagement_id)
  )
);

CREATE TRIGGER update_going_concern_workpapers_updated_at
  BEFORE UPDATE ON public.going_concern_workpapers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_going_concern_checklist_items_updated_at
  BEFORE UPDATE ON public.going_concern_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gc_annexure_net_worth_updated_at
  BEFORE UPDATE ON public.gc_annexure_net_worth
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gc_annexure_profitability_updated_at
  BEFORE UPDATE ON public.gc_annexure_profitability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gc_annexure_borrowings_updated_at
  BEFORE UPDATE ON public.gc_annexure_borrowings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gc_annexure_cash_flows_updated_at
  BEFORE UPDATE ON public.gc_annexure_cash_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gc_annexure_ratios_updated_at
  BEFORE UPDATE ON public.gc_annexure_ratios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FEEDBACK TABLES
-- =====================================================

CREATE TABLE public.feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title TEXT,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.feedback_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by uuid NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their feedback reports or partners can view all"
ON public.feedback_reports FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'partner')
);

CREATE POLICY "Users can create their own feedback reports"
ON public.feedback_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners can update feedback reports"
ON public.feedback_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'partner'));

CREATE POLICY "Users can view feedback attachments for accessible reports"
ON public.feedback_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.feedback_reports r
    WHERE r.id = feedback_attachments.report_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'partner'))
  )
);

CREATE POLICY "Users can add feedback attachments for accessible reports"
ON public.feedback_attachments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.feedback_reports r
    WHERE r.id = feedback_attachments.report_id
      AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'partner'))
  )
);

CREATE TRIGGER update_feedback_reports_updated_at
  BEFORE UPDATE ON public.feedback_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
