export type AssetStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'FAULTY' | 'DECOMMISSIONED';

export interface AssetSpecs {
  [key: string]: string | number | boolean;
}

export interface Asset {
  id: number;
  assetCode: string;
  name: string;
  location?: string;
  departmentId?: number;
  departmentName?: string;
  qrToken: string;
  status: AssetStatus;
  specs: AssetSpecs;
  incidentCount?: number;
  createdAt: string;
}

export interface AssetContext {
  asset: Asset;
  activeIncidents: Array<{
    id: number;
    taskId: number;
    title: string;
    severity: string;
    stateName: string;
    stateColor: string;
    reporterName: string;
  }>;
  availableChecklists: Array<{
    id: number;
    title: string;
    itemCount: number;
  }>;
}
