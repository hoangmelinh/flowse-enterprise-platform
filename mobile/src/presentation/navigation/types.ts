import { NavigatorScreenParams } from '@react-navigation/native';
import { Routes } from '../../core/constants/routes';

export type MainTabParamList = {
  [Routes.HOME]: undefined;
  [Routes.WORK_ITEMS]: undefined;
  [Routes.QR_SCANNER]: undefined;
  [Routes.APPROVALS]: undefined;
  [Routes.PROFILE]: undefined;
};

export type RootStackParamList = {
  [Routes.AUTH_STACK]: undefined;
  [Routes.MAIN_TABS]: NavigatorScreenParams<MainTabParamList>;
  [Routes.LOGIN]: undefined;
  [Routes.CONTEXT_SELECT]: undefined;
  [Routes.WORK_ITEM_DETAIL]: { workItemId: number; title?: string };
  [Routes.CREATE_WORK_ITEM]: { defaultType?: string; listId?: number };
  [Routes.ASSET_DETAIL]: { assetId: number; assetCode?: string };
  [Routes.REPORT_INCIDENT]: { prefilledAssetId?: number; prefilledAssetCode?: string };
  [Routes.INCIDENT_TRIAGE]: { incidentId: number };
  [Routes.INSPECTION_RUNNER]: { checklistId: number; assetId?: number };
  [Routes.REQUEST_MATERIAL_MODAL]: { taskId: number; incidentId?: number };
  [Routes.NOTIFICATIONS]: undefined;
};
