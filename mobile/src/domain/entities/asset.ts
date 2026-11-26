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

/** Một lần sự cố / sửa trong lịch sử máy (nguyên nhân và cách sửa do kỹ thuật viên ghi khi báo xong). */
export interface RepairEvent {
  id: number;
  title: string;
  symptom?: string;
  rootCause?: string;
  resolution?: string;
  fixer?: string;
  occurredAt?: string;
  resolvedAt?: string;
  open: boolean;
  downtimeMinutes?: number;
}

export interface AssetRecord {
  asset: Asset;
  repairs: RepairEvent[];
}

/** Flowse AI đọc lịch sử sửa của máy: nguyên nhân hay gặp (kèm mã sự cố làm nguồn) và các bước xử lý gợi ý. */
export interface AssetInsight {
  summary: string;
  likelyCauses: { cause: string; incidentIds: number[] }[];
  steps: string[];
  insufficientData: boolean;
  safetyNote: string;
}
