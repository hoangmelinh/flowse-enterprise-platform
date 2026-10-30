export const Routes = {
  // Auth Stack
  AUTH_STACK: 'AuthStack',
  LOGIN: 'Login',
  CONTEXT_SELECT: 'ContextSelect',

  // Main Tabs (thay đổi theo vai trò: văn phòng / hiện trường)
  MAIN_TABS: 'MainTabs',
  HOME: 'Home',
  WORK_ITEMS: 'WorkItems',
  REQUESTS: 'Requests',
  INBOX: 'Inbox',
  QR_SCANNER: 'QRScanner',
  INCIDENTS: 'Incidents',
  PROFILE: 'Profile',

  // Feature Screens
  WORK_ITEM_DETAIL: 'WorkItemDetail',
  CREATE_WORK_ITEM: 'CreateWorkItem',
  ASSIGN_SHEET: 'AssignSheet',
  COMMENTS: 'Comments',
  SPACES: 'Spaces',
  SPACE_DETAIL: 'SpaceDetail',
  ASSET_DETAIL: 'AssetDetail',
  REPORT_INCIDENT: 'ReportIncident',
  INCIDENT_DETAIL: 'IncidentDetail',
  INCIDENT_TRIAGE: 'IncidentTriage',
  INSPECTIONS: 'Inspections',
  INSPECTION_RUNNER: 'InspectionRunner',
  INSPECTION_RESULT: 'InspectionResult',
  REQUEST_TYPES: 'RequestTypes',
  REQUEST_FORM: 'RequestForm',
  REQUEST_DETAIL: 'RequestDetail',
  APPROVALS: 'Approvals',
  APPROVAL_DECISION: 'ApprovalDecision',
  REJECT_REASON: 'RejectReason',
  MATERIALS: 'Materials',
  HANDOVER: 'Handover',
  SYNC_QUEUE: 'SyncQueue',
  CHAT: 'Chat',
  NOTIFICATION_SETTINGS: 'NotificationSettings',
  FLOWSE_AI: 'FlowseAI',
  SUCCESS: 'Success',
} as const;

export type RouteKey = keyof typeof Routes;
export type RouteName = (typeof Routes)[RouteKey];
