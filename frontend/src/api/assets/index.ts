import { beApi } from "../callApi";

export interface Asset {
  asset_id: number;
  asset_code: string;
  name: string;
  location: string;
  department_name?: string;
  qr_token: string;
  status: string;
  incident_count?: number;
  health_score?: number;
  last_health_updated_at?: string;
}

export interface HealthScoreBreakdownItem {
  reason: string;
  severity?: string;
  delta: number;
}

export interface HealthScoreSnapshot {
  snapshot_id: number;
  asset_id: number;
  health_score: number;
  delta: number;
  reason: string;
  trigger_type: string;
  metadata?: any;
  recorded_at: string;
}

export interface HealthTimelineEvent {
  type: "INCIDENT" | "INSPECTION";
  id: number;
  title: string;
  subtitle: string;
  severity?: string;
  status: string;
  state_name?: string;
  state_color?: string;
  downtime_minutes?: number;
  actor?: string;
  occurred_at: string;
  resolved_at?: string;
}

export interface AssetHealthRecord {
  asset: Asset & { department_name?: string; specs?: any };
  healthScore: number;
  scoreBreakdown: HealthScoreBreakdownItem[];
  openIncidents: any[];
  recentInspections: any[];
  timeline: HealthTimelineEvent[];
  snapshots?: HealthScoreSnapshot[];
}

const ASSETS_CACHE_KEY = "flowse_cached_assets_v1";

export function getCachedAssets(): Asset[] {
  try {
    const raw = localStorage.getItem(ASSETS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const getAssets = async (): Promise<{ success: boolean; data: Asset[] }> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = getCachedAssets();
    return { success: true, data: cached };
  }
  try {
    const res: any = await beApi.get("/assets");
    const data = res?.data || [];
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify(data));
    }
    return res;
  } catch (err) {
    const cached = getCachedAssets();
    if (cached.length > 0) {
      return { success: true, data: cached };
    }
    throw err;
  }
};

export const resolveQrContext = async (qrToken: string) => {
  return beApi.get(`/assets/resolve?token=${encodeURIComponent(qrToken)}`);
};

export const createAsset = async (data: {
  asset_code: string;
  name: string;
  location?: string;
  department_id?: number;
  specs?: any;
}): Promise<{ success: boolean; data: Asset }> => {
  return beApi.post("/assets", data);
};

export const getAssetHealthRecord = async (
  assetId: number | string
): Promise<{ success: boolean; data: AssetHealthRecord }> => {
  return beApi.get(`/assets/${assetId}/health-record`);
};
