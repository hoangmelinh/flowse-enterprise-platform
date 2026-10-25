export type UserRoleName = 'admin' | 'manager' | 'technician' | 'qa' | 'member';

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phoneNumber?: string;
  role: UserRoleName;
  departmentId?: number;
  departmentName?: string;
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description?: string;
  role: UserRoleName;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  managerId?: number;
}

export interface UserCapabilities {
  canScanQR: boolean;
  canReportIncident: boolean;
  canTriageIncident: boolean;
  canExecuteRepair: boolean;
  canVerifyIncident: boolean;
  canCloseIncident: boolean;
  canRunInspection: boolean;
  canApprove: boolean;
  canCreateTask: boolean;
  canAssignWork: boolean;
}
