import { WorkItem } from './workitem';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Incident {
  id: number;
  taskId: number;
  task?: WorkItem;
  assetId?: number;
  assetCode?: string;
  assetName?: string;
  assetLocation?: string;
  reporterId: number;
  reporterName?: string;
  reporterAvatar?: string;
  severity: IncidentSeverity;
  symptom: string;
  evidenceUrls: string[];
  verifiedBy?: number;
  verifierName?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface ReportIncidentParams {
  title: string;
  symptom: string;
  assetId: number;
  severity: IncidentSeverity;
  evidencePhotos: string[]; // local uris or uploaded urls
  listId?: number;
}
