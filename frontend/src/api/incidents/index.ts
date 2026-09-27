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
}

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
