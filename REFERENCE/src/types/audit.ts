export interface Client {
  id: string;
  name: string;
  industry: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  createdAt: Date;
}

export interface Engagement {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  type: 'statutory' | 'internal' | 'tax' | 'special';
  fiscalYearEnd: string;
  status: 'planning' | 'fieldwork' | 'review' | 'completion' | 'locked';
  partner: string;
  manager: string;
  team: TeamMember[];
  acceptanceComplete: boolean;
  materialityApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'partner' | 'manager' | 'senior' | 'staff';
  email: string;
}

export interface TrialBalanceLine {
  id: string;
  accountCode: string;
  accountName: string;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
  fsArea: string;
  note: string;
  mappedTo?: string;
}

export interface Materiality {
  id: string;
  engagementId: string;
  version: number;
  benchmark: string;
  benchmarkAmount: number;
  percentage: number;
  overallMateriality: number;
  performanceMateriality: number;
  trivialThreshold: number;
  rationale: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export interface Risk {
  id: string;
  engagementId: string;
  name: string;
  description: string;
  fsArea: string;
  assertion: Assertion;
  level: 'high' | 'medium' | 'low';
  inherentRisk: 'high' | 'medium' | 'low';
  controlRisk: 'high' | 'medium' | 'low';
  response: string;
  linkedProcedures: string[];
  status: 'identified' | 'assessed' | 'responded' | 'concluded';
  createdAt: Date;
}

export type Assertion = 
  | 'existence'
  | 'completeness'
  | 'accuracy'
  | 'valuation'
  | 'rights_obligations'
  | 'presentation'
  | 'occurrence'
  | 'cutoff';

export interface AuditProcedure {
  id: string;
  engagementId: string;
  programId: string;
  name: string;
  description: string;
  fsArea: string;
  type: 'substantive' | 'control' | 'analytical';
  linkedRisks: string[];
  assignedTo: string;
  dueDate: Date;
  status: 'not_started' | 'in_progress' | 'done' | 'reviewed';
  conclusion?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  evidence: Evidence[];
  createdAt: Date;
}

export interface AuditProgram {
  id: string;
  engagementId: string;
  name: string;
  fsArea: string;
  procedures: AuditProcedure[];
  status: 'draft' | 'approved' | 'in_progress' | 'complete';
  createdAt: Date;
}

export interface Evidence {
  id: string;
  procedureId: string;
  name: string;
  type: 'document' | 'screenshot' | 'confirmation' | 'analysis' | 'other';
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
  linkedToTBLine?: string;
  linkedToFSArea?: string;
  tickMark?: string;
  workpaperRef?: string;
}

export interface ReviewNote {
  id: string;
  engagementId: string;
  procedureId?: string;
  fsArea?: string;
  title: string;
  description: string;
  raisedBy: string;
  raisedAt: Date;
  status: 'open' | 'responded' | 'cleared' | 'reopened';
  priority: 'high' | 'medium' | 'low';
  response?: string;
  respondedBy?: string;
  respondedAt?: Date;
  clearedBy?: string;
  clearedAt?: Date;
}

export interface Misstatement {
  id: string;
  engagementId: string;
  description: string;
  fsArea: string;
  amount: number;
  type: 'factual' | 'judgmental' | 'projected';
  adjusted: boolean;
  reason?: string;
  createdAt: Date;
}

export interface AuditEvent {
  id: string;
  engagementId: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  details: string;
  timestamp: Date;
}

export interface CompletionChecklistItem {
  id: string;
  category: string;
  item: string;
  status: 'pending' | 'complete' | 'na';
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
}
