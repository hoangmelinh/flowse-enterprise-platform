import { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Routes } from '../../core/constants/routes';

export type MainTabParamList = {
  [Routes.HOME]: undefined;
  [Routes.WORK_ITEMS]: undefined;
  [Routes.REQUESTS]: undefined;
  [Routes.INBOX]: undefined;
  [Routes.QR_SCANNER]: undefined;
  [Routes.INCIDENTS]: undefined;
  [Routes.PROFILE]: undefined;
};

/** Màn hoàn tất dùng chung: phiếu bay vào khay rồi hiện dấu tích */
export type SuccessParams = { title: string; body: string; kind: string; code: string; primary?: string };

export type RootStackParamList = {
  [Routes.AUTH_STACK]: undefined;
  [Routes.MAIN_TABS]: NavigatorScreenParams<MainTabParamList>;
  [Routes.LOGIN]: undefined;
  [Routes.CONTEXT_SELECT]: undefined;
  [Routes.WORK_ITEM_DETAIL]: { workItemId: number; title?: string };
  [Routes.CREATE_WORK_ITEM]: { listName?: string } | undefined;
  [Routes.ASSIGN_SHEET]: { title?: string } | undefined;
  [Routes.COMMENTS]: { code: string };
  [Routes.SPACES]: { projectsOnly?: boolean } | undefined;
  [Routes.SPACE_DETAIL]: { spaceId: number; name: string };
  [Routes.ASSET_DETAIL]: { assetCode: string };
  [Routes.REPORT_INCIDENT]: { assetCode?: string } | undefined;
  [Routes.INCIDENT_DETAIL]: { incidentId: number };
  [Routes.INCIDENT_TRIAGE]: { incidentId: number };
  [Routes.INSPECTIONS]: undefined;
  [Routes.INSPECTION_RUNNER]: { inspectionId: number };
  [Routes.INSPECTION_RESULT]: { passed: number; total: number };
  [Routes.REQUEST_TYPES]: undefined;
  [Routes.REQUEST_FORM]: { typeKey: string };
  [Routes.REQUEST_DETAIL]: { requestId: number };
  [Routes.APPROVALS]: undefined;
  [Routes.APPROVAL_DECISION]: { approvalId: number };
  [Routes.REJECT_REASON]: { approvalId: number };
  [Routes.MATERIALS]: undefined;
  [Routes.HANDOVER]: undefined;
  [Routes.SYNC_QUEUE]: undefined;
  [Routes.CHAT]: { conversationId: number; name: string };
  [Routes.NOTIFICATION_SETTINGS]: undefined;
  [Routes.FLOWSE_AI]: undefined;
  [Routes.SUCCESS]: SuccessParams;
};

export type ScreenProps<R extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, R>;
