export const Routes = {
  // Auth Stack
  AUTH_STACK: 'AuthStack',
  LOGIN: 'Login',
  CONTEXT_SELECT: 'ContextSelect',

  // Main Tabs
  MAIN_TABS: 'MainTabs',
  HOME: 'Home',
  WORK_ITEMS: 'WorkItems',
  QR_SCANNER: 'QRScanner',
  APPROVALS: 'Approvals',
  PROFILE: 'Profile',

  // Feature Screens
  WORK_ITEM_DETAIL: 'WorkItemDetail',
  CREATE_WORK_ITEM: 'CreateWorkItem',
  ASSET_DETAIL: 'AssetDetail',
  REPORT_INCIDENT: 'ReportIncident',
  INCIDENT_TRIAGE: 'IncidentTriage',
  INSPECTION_RUNNER: 'InspectionRunner',
  REQUEST_MATERIAL_MODAL: 'RequestMaterialModal',
  NOTIFICATIONS: 'Notifications',
} as const;

export type RouteKey = keyof typeof Routes;
export type RouteName = (typeof Routes)[RouteKey];
