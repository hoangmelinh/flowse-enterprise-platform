import { beApi } from "../callApi";

export interface ChecklistItem {
  item_id: number;
  question: string;
  require_evidence: boolean;
  fail_severity: string;
  position: number;
}

export interface Checklist {
  checklist_id: number;
  asset_id: number;
  title: string;
  description: string;
  items: ChecklistItem[];
}

export interface InspectionSubmissionResult {
  itemId: number;
  isPassed: boolean;
  note?: string;
  evidenceUrl?: string;
}

export const getAssetChecklist = async (
  assetId: number | string
): Promise<{ success: boolean; data: Checklist }> => {
  return beApi.get(`/inspections/asset/${assetId}/checklist`);
};

export const submitInspection = async (payload: {
  assetId: number | string;
  checklistId?: number | string;
  results: InspectionSubmissionResult[];
}): Promise<{
  success: boolean;
  message: string;
  data: {
    run: any;
    overallStatus: "PASS" | "FAIL";
    failedCount: number;
    autoIncident?: any;
  };
}> => {
  return beApi.post("/inspections/submit", payload);
};
