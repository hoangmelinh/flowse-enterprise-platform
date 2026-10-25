export interface ChecklistItem {
  id: number;
  question: string;
  requireEvidence: boolean;
  failSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  position: number;
}

export interface Checklist {
  id: number;
  assetId?: number;
  title: string;
  description?: string;
  items: ChecklistItem[];
}

export interface CheckpointResult {
  itemId: number;
  isPassed: boolean;
  note?: string;
  evidenceUri?: string;
}

export interface InspectionSubmission {
  checklistId: number;
  taskId?: number;
  results: CheckpointResult[];
}
