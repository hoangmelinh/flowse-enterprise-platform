import { beApi } from "../callApi";

export interface IncidentItem {
  incident_id: number;
  task_id: number;
  task_name: string;
  task_description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  symptom: string;
  evidence_urls: string[];
  state_code: string;
  state_name: string;
  state_color: string;
  asset_code: string;
  asset_name: string;
  asset_location: string;
  reporter_name: string;
  reported_at: string;
  assignee_id?: number;
  assignee_name?: string;
  sla_status?: "IN_SLA" | "AT_RISK" | "BREACHED" | "COMPLETED";
  sla_deadline_at?: string;
  sla_started_at?: string;
  resolved_at?: string;
  downtime_minutes?: number;
  resolved_evidence_urls?: string[];
  ai_evidence_status?: "VERIFIED" | "WARNING" | "NOT_EVALUATED";
  ai_evidence_feedback?: string;
  ai_evidence_score?: number;
}

export interface DowntimeStats {
  totalIncidents: number;
  resolvedIncidents: number;
  openIncidents: number;
  totalDowntimeMinutes: number;
  formattedTotalDowntime: string;
  mttrMinutes: number;
  slaMetCount: number;
  slaBreachedCount: number;
  topDowntimeAssets: Array<{
    asset_id: number;
    asset_name: string;
    asset_code: string;
    location: string;
    incident_count: number;
    total_downtime_minutes: number;
  }>;
}

export const getDowntimeStats = async (): Promise<{ success: boolean; data: DowntimeStats }> => {
  return beApi.get("/incidents/stats/downtime-mttr");
};

export const getIncidents = async (): Promise<{ success: boolean; data: IncidentItem[] }> => {
  return beApi.get("/incidents");
};

export const reportIncident = async (payload: {
  title: string;
  symptom: string;
  asset_id?: number;
  severity?: string;
  evidence_urls?: string[];
}) => {
  return beApi.post("/incidents", payload);
};

export const requestSpareParts = async (
  incidentId: number | string,
  payload: { partName: string; quantity?: number; reason?: string }
): Promise<{ success: boolean; message: string; data: any }> => {
  return beApi.post(`/incidents/${incidentId}/request-parts`, payload);
};

export const deleteIncident = async (
  incidentId: number | string
): Promise<{ success: boolean; message: string }> => {
  return beApi.delete(`/incidents/${incidentId}`);
};

export interface AIEvidenceAnalysis {
  isValid: boolean;
  status: "VERIFIED" | "WARNING";
  score: number;
  tags: string[];
  feedback: string;
}

export const analyzeEvidence = async (payload: {
  imageUrl: string;
  incidentTitle?: string;
  assetName?: string;
  symptom?: string;
}): Promise<{ success: boolean; data: AIEvidenceAnalysis }> => {
  return beApi.post("/incidents/analyze-evidence", payload);
};

