import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type EngagementPeriodType = 'CY' | 'PY';

export type EngagementTrialBalanceHeader = {
  id: string;
  engagement_id: string;
  period_type: EngagementPeriodType;
  financial_year: string;
  source_type: string | null;
  imported_at: string | null;
  imported_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EngagementTrialBalanceLine = {
  id: string;
  tb_header_id: string;
  engagement_id: string;
  ledger_name: string;
  ledger_guid: string | null;
  primary_group: string | null;
  parent_group: string | null;
  composite_key: string;
  opening: number;
  debit: number;
  credit: number;
  closing: number;
  dr_cr: string | null;
  is_revenue: boolean | null;
  created_at: string;
  updated_at: string;
};

export type EngagementTrialBalanceClassification = {
  id: string;
  tb_line_id: string;
  statement_type: 'BS' | 'PL' | 'NOTES';
  h1: string | null;
  h2: string | null;
  h3: string | null;
  h4: string | null;
  h5: string | null;
  note_ref: string | null;
  status: string | null;
  category_code: string | null;
  category_name: string | null;
  confidence: number | null;
  classification_method: string | null;
  created_at: string;
  updated_at: string;
};

export type EngagementTrialBalanceLineInput = {
  ledger_name: string;
  ledger_guid?: string | null;
  primary_group?: string | null;
  parent_group?: string | null;
  composite_key: string;
  opening?: number;
  debit?: number;
  credit?: number;
  closing?: number;
  dr_cr?: string | null;
  is_revenue?: boolean | null;
};

export type EngagementTrialBalanceClassificationInput = {
  composite_key: string;
  statement_type: 'BS' | 'PL' | 'NOTES';
  h1?: string | null;
  h2?: string | null;
  h3?: string | null;
  h4?: string | null;
  h5?: string | null;
  note_ref?: string | null;
  status?: string | null;
  category_code?: string | null;
  category_name?: string | null;
  confidence?: number | null;
  classification_method?: string | null;
};

type EnsureHeaderOptions = {
  sourceType?: string;
  importedAt?: string;
  updateMetadata?: boolean;
};

type SaveLinesOptions = {
  sourceType?: string;
  importedAt?: string;
  updateMetadata?: boolean;
};

export function useEngagementTrialBalance(
  engagementId: string | undefined,
  periodType: EngagementPeriodType | undefined,
  financialYear: string | undefined
) {
  const { user } = useAuth();
  const [header, setHeader] = useState<EngagementTrialBalanceHeader | null>(null);
  const [lines, setLines] = useState<EngagementTrialBalanceLine[]>([]);
  const [classifications, setClassifications] = useState<EngagementTrialBalanceClassification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!engagementId || !periodType || !financialYear) {
      setHeader(null);
      setLines([]);
      setClassifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: headerData, error: headerError } = await supabase
        .from('engagement_trial_balance_header')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('period_type', periodType)
        .eq('financial_year', financialYear)
        .maybeSingle();

      if (headerError) throw headerError;

      if (!headerData) {
        setHeader(null);
        setLines([]);
        setClassifications([]);
        return;
      }

      const { data: lineData, error: lineError } = await supabase
        .from('engagement_trial_balance_lines')
        .select('*')
        .eq('tb_header_id', headerData.id)
        .order('ledger_name', { ascending: true });

      if (lineError) throw lineError;

      const lineRows = (lineData || []) as EngagementTrialBalanceLine[];
      let classificationRows: EngagementTrialBalanceClassification[] = [];

      if (lineRows.length > 0) {
        const lineIds = lineRows.map(line => line.id);
        const { data: classificationData, error: classificationError } = await supabase
          .from('engagement_tb_classification')
          .select('*')
          .in('tb_line_id', lineIds);

        if (classificationError) throw classificationError;
        classificationRows = (classificationData || []) as EngagementTrialBalanceClassification[];
      }

      setHeader(headerData as EngagementTrialBalanceHeader);
      setLines(lineRows);
      setClassifications(classificationRows);
    } catch (error) {
      console.error('Error loading engagement trial balance data:', error);
      setHeader(null);
      setLines([]);
      setClassifications([]);
    } finally {
      setLoading(false);
    }
  }, [engagementId, financialYear, periodType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const ensureHeader = useCallback(
    async (options: EnsureHeaderOptions = {}) => {
      if (!engagementId || !periodType || !financialYear) return null;

      const { data: existing, error: existingError } = await supabase
        .from('engagement_trial_balance_header')
        .select('*')
        .eq('engagement_id', engagementId)
        .eq('period_type', periodType)
        .eq('financial_year', financialYear)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        if (options.updateMetadata) {
          const updates: Partial<EngagementTrialBalanceHeader> = {};
          if (options.sourceType !== undefined) updates.source_type = options.sourceType;
          if (options.importedAt !== undefined) updates.imported_at = options.importedAt;
          if (Object.keys(updates).length > 0) {
            const { data: updated, error: updateError } = await supabase
              .from('engagement_trial_balance_header')
              .update(updates)
              .eq('id', existing.id)
              .select()
              .single();
            if (updateError) throw updateError;
            return updated as EngagementTrialBalanceHeader;
          }
        }
        return existing as EngagementTrialBalanceHeader;
      }

      const insertPayload = {
        engagement_id: engagementId,
        period_type: periodType,
        financial_year: financialYear,
        source_type: options.sourceType ?? null,
        imported_at: options.importedAt ?? new Date().toISOString(),
        imported_by: user?.id ?? null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('engagement_trial_balance_header')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      return inserted as EngagementTrialBalanceHeader;
    },
    [engagementId, financialYear, periodType, user?.id]
  );

  const deleteLinesByIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const batchSize = 100;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const { error } = await supabase
        .from('engagement_trial_balance_lines')
        .delete()
        .in('id', batch);
      if (error) throw error;
    }
  }, []);

  const replaceLines = useCallback(
    async (
      lineInputs: EngagementTrialBalanceLineInput[],
      classificationInputs: EngagementTrialBalanceClassificationInput[],
      options: SaveLinesOptions = {}
    ) => {
      if (!engagementId) return false;

      const headerRow = await ensureHeader({
        sourceType: options.sourceType,
        importedAt: options.importedAt,
        updateMetadata: options.updateMetadata ?? true,
      });

      if (!headerRow) return false;

      const { error: deleteError } = await supabase
        .from('engagement_trial_balance_lines')
        .delete()
        .eq('tb_header_id', headerRow.id);

      if (deleteError) throw deleteError;

      if (lineInputs.length === 0) {
        await fetchData();
        return true;
      }

      const linesToInsert = lineInputs.map(line => ({
        tb_header_id: headerRow.id,
        engagement_id: engagementId,
        ledger_name: line.ledger_name,
        ledger_guid: line.ledger_guid ?? null,
        primary_group: line.primary_group ?? null,
        parent_group: line.parent_group ?? null,
        composite_key: line.composite_key,
        opening: line.opening ?? 0,
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
        closing: line.closing ?? 0,
        dr_cr: line.dr_cr ?? null,
        is_revenue: line.is_revenue ?? null,
      }));

      const { data: insertedLines, error: insertError } = await supabase
        .from('engagement_trial_balance_lines')
        .insert(linesToInsert)
        .select('id, composite_key');

      if (insertError) throw insertError;

      const classificationMap = new Map(
        classificationInputs.map(input => [input.composite_key, input])
      );
      const classificationRows = (insertedLines || [])
        .map(line => {
          const input = classificationMap.get(line.composite_key);
          if (!input) return null;
          return {
            tb_line_id: line.id,
            statement_type: input.statement_type,
            h1: input.h1 ?? null,
            h2: input.h2 ?? null,
            h3: input.h3 ?? null,
            h4: input.h4 ?? null,
            h5: input.h5 ?? null,
            note_ref: input.note_ref ?? null,
            status: input.status ?? null,
            category_code: input.category_code ?? null,
            category_name: input.category_name ?? null,
            confidence: input.confidence ?? null,
            classification_method: input.classification_method ?? null,
          };
        })
        .filter(
          (row): row is {
            tb_line_id: string;
            statement_type: 'BS' | 'PL' | 'NOTES';
            h1: string | null;
            h2: string | null;
            h3: string | null;
            h4: string | null;
            h5: string | null;
            note_ref: string | null;
            status: string | null;
            category_code: string | null;
            category_name: string | null;
            confidence: number | null;
            classification_method: string | null;
          } => Boolean(row)
        );

      if (classificationRows.length > 0) {
        const { error: classificationError } = await supabase
          .from('engagement_tb_classification')
          .insert(classificationRows);

        if (classificationError) throw classificationError;
      }

      await fetchData();
      return true;
    },
    [engagementId, ensureHeader, fetchData]
  );

  const upsertLines = useCallback(
    async (
      lineInputs: EngagementTrialBalanceLineInput[],
      classificationInputs: EngagementTrialBalanceClassificationInput[],
      options: SaveLinesOptions = {}
    ) => {
      if (!engagementId) return false;

      const headerRow = await ensureHeader({
        sourceType: options.sourceType,
        importedAt: options.importedAt,
        updateMetadata: options.updateMetadata ?? false,
      });

      if (!headerRow) return false;

      const { data: existingLines, error: existingError } = await supabase
        .from('engagement_trial_balance_lines')
        .select('id, composite_key')
        .eq('tb_header_id', headerRow.id);

      if (existingError) throw existingError;

      const incomingKeys = new Set(lineInputs.map(line => line.composite_key));
      const toDelete = (existingLines || [])
        .filter(line => !incomingKeys.has(line.composite_key))
        .map(line => line.id);

      if (toDelete.length > 0) {
        await deleteLinesByIds(toDelete);
      }

      if (lineInputs.length > 0) {
        const linesToUpsert = lineInputs.map(line => ({
          tb_header_id: headerRow.id,
          engagement_id: engagementId,
          ledger_name: line.ledger_name,
          ledger_guid: line.ledger_guid ?? null,
          primary_group: line.primary_group ?? null,
          parent_group: line.parent_group ?? null,
          composite_key: line.composite_key,
          opening: line.opening ?? 0,
          debit: line.debit ?? 0,
          credit: line.credit ?? 0,
          closing: line.closing ?? 0,
          dr_cr: line.dr_cr ?? null,
          is_revenue: line.is_revenue ?? null,
        }));

        const { error: upsertError } = await supabase
          .from('engagement_trial_balance_lines')
          .upsert(linesToUpsert, { onConflict: 'tb_header_id,composite_key' });

        if (upsertError) throw upsertError;

        const { data: refreshedLines, error: refreshedError } = await supabase
          .from('engagement_trial_balance_lines')
          .select('id, composite_key')
          .eq('tb_header_id', headerRow.id)
          .in('composite_key', Array.from(incomingKeys));

        if (refreshedError) throw refreshedError;

        const classificationMap = new Map(
          classificationInputs.map(input => [input.composite_key, input])
        );

        const classificationRows = (refreshedLines || [])
          .map(line => {
            const input = classificationMap.get(line.composite_key);
            if (!input) return null;
            return {
              tb_line_id: line.id,
              statement_type: input.statement_type,
              h1: input.h1 ?? null,
              h2: input.h2 ?? null,
              h3: input.h3 ?? null,
              h4: input.h4 ?? null,
              h5: input.h5 ?? null,
              note_ref: input.note_ref ?? null,
              status: input.status ?? null,
              category_code: input.category_code ?? null,
              category_name: input.category_name ?? null,
              confidence: input.confidence ?? null,
              classification_method: input.classification_method ?? null,
            };
          })
          .filter(
            (row): row is {
              tb_line_id: string;
              statement_type: 'BS' | 'PL' | 'NOTES';
              h1: string | null;
              h2: string | null;
              h3: string | null;
              h4: string | null;
              h5: string | null;
              note_ref: string | null;
              status: string | null;
              category_code: string | null;
              category_name: string | null;
              confidence: number | null;
              classification_method: string | null;
            } => Boolean(row)
          );

        if (classificationRows.length > 0) {
          const { error: classificationError } = await supabase
            .from('engagement_tb_classification')
            .upsert(classificationRows, { onConflict: 'tb_line_id,statement_type' });

          if (classificationError) throw classificationError;
        }
      }

      await fetchData();
      return true;
    },
    [deleteLinesByIds, engagementId, ensureHeader, fetchData]
  );

  const clearPeriodData = useCallback(async () => {
    if (!engagementId || !periodType || !financialYear) return false;

    const { error } = await supabase
      .from('engagement_trial_balance_header')
      .delete()
      .eq('engagement_id', engagementId)
      .eq('period_type', periodType)
      .eq('financial_year', financialYear);

    if (error) throw error;
    await fetchData();
    return true;
  }, [engagementId, fetchData, financialYear, periodType]);

  return {
    header,
    lines,
    classifications,
    loading,
    refetch: fetchData,
    replaceLines,
    upsertLines,
    clearPeriodData,
  };
}
