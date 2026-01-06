// Type definitions for Procedure Templates with workpaper fields

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  order: number;
}

export interface ChecklistItemInstance extends ChecklistItem {
  done: boolean;
  done_by?: string;
  done_at?: string;
}

export interface EvidenceRequirement {
  id: string;
  label: string;
  required: boolean;
  order: number;
  allowed_types?: string[];
  wp_ref_hint?: string;
}

export interface EvidenceRequirementInstance extends EvidenceRequirement {
  satisfied: boolean;
}

export interface ProcedureTemplateExtended {
  id: string;
  program_id: string | null;
  procedure_name: string;
  description: string | null;
  area: string;
  assertion: string | null;
  is_standalone: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  // New workpaper fields
  checklist_items: ChecklistItem[];
  evidence_requirements: EvidenceRequirement[];
  conclusion_prompt: string | null;
  default_status: string | null;
}

export interface ProcedureTemplateFormDataExtended {
  procedure_name: string;
  description: string | null;
  area: string;
  assertion: string | null;
  program_id: string | null;
  checklist_items: ChecklistItem[];
  evidence_requirements: EvidenceRequirement[];
  conclusion_prompt: string | null;
  default_status: string | null;
}

// Helper to generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Helper to safely parse JSONB arrays from database
export function parseChecklistItems(data: unknown): ChecklistItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data.filter(
    (item): item is ChecklistItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.text === 'string' &&
      typeof item.required === 'boolean' &&
      typeof item.order === 'number'
  );
}

export function parseEvidenceRequirements(data: unknown): EvidenceRequirement[] {
  if (!data || !Array.isArray(data)) return [];
  return data.filter(
    (item): item is EvidenceRequirement =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.id === 'string' &&
      typeof item.label === 'string' &&
      typeof item.required === 'boolean' &&
      typeof item.order === 'number'
  );
}

// Convert template checklist to instance format (with done=false)
export function toChecklistInstance(items: ChecklistItem[]): ChecklistItemInstance[] {
  return items.map(item => ({
    ...item,
    done: false,
  }));
}

// Convert template evidence to instance format (with satisfied=false)
export function toEvidenceInstance(items: EvidenceRequirement[]): EvidenceRequirementInstance[] {
  return items.map(item => ({
    ...item,
    satisfied: false,
  }));
}
