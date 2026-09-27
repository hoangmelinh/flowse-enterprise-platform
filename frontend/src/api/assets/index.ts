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
}

export const getAssets = async (): Promise<{ success: boolean; data: Asset[] }> => {
  return beApi.get("/assets");
};

export const resolveQrContext = async (qrToken: string) => {
  return beApi.get(`/assets/resolve?token=${encodeURIComponent(qrToken)}`);
};
