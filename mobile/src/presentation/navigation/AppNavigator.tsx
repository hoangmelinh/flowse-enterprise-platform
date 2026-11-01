import React, { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, SquareCheckBig, ScanLine, FileText, Inbox, TriangleAlert, CircleUser, LucideIcon } from 'lucide-react-native';
import { Routes } from '../../core/constants/routes';
import { text, useColors } from '../../core/theme';
import { RootStackParamList, MainTabParamList } from './types';
import { useAuthStore } from '../state/authStore';
import { usePrefs } from '../state/prefsStore';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { ContextSelectScreen } from '../screens/auth/ContextSelectScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SuccessScreen } from '../screens/common/SuccessScreen';
import {
  WorkItemsScreen, WorkItemDetailScreen, CreateWorkItemScreen, AssignSheet, CommentsScreen, SpacesScreen, SpaceDetailScreen,
} from '../screens/work/WorkScreens';
import {
  QRScannerScreen, AssetDetailScreen, ReportIncidentScreen, IncidentsScreen, IncidentDetailScreen, IncidentTriageSheet,
} from '../screens/field/FieldScreens';
import {
  InspectionsScreen, InspectionRunnerScreen, InspectionResultScreen, RequestsScreen, RequestTypesScreen, RequestFormScreen,
  RequestDetailScreen, ApprovalsScreen, ApprovalDecisionScreen, RejectReasonSheet,
} from '../screens/requests/RequestScreens';
import { MaterialsScreen, HandoverScreen, SyncQueueScreen } from '../screens/ops/OpsScreens';
import { RepairOrderScreen, HandoverReceiveScreen, MaterialIssueScreen, ProductionScreen, SearchScreen } from '../screens/more/MoreScreens';
import { InboxScreen, ChatScreen, NotificationSettingsScreen } from '../screens/inbox/InboxScreens';
import { AppearanceScreen, NewMessageSheet, ChannelMembersSheet } from '../screens/inbox/InboxMoreScreens';
import {
  ForgotPasswordScreen, CheckEmailScreen, NewPasswordScreen, AccountLockedScreen, SessionExpiredScreen, PermissionsScreen,
} from '../screens/auth/AccountScreens';
import { RolePickerScreen } from '../screens/home/RoleHomes';
import {
  ListViewScreen, SubtasksScreen, ReviewScreen, ProjectDetailScreen, PickProjectSheet, WorkFilterSheet, TeamScreen, MemberWorkScreen,
  ReassignScreen, UnitsScreen, LineDetailScreen, FieldWorkScreen, ShiftTransferSheet,
} from '../screens/work/WorkMoreScreens';
import { PmListScreen, SopScreen, InspectionSubmitScreen, NcrNewScreen, NcrDetailScreen, LotTraceScreen } from '../screens/field/QualityScreens';
import {
  RequestEditScreen, DelegationScreen, MaterialRequestScreen, PurchaseUpdateScreen, MaterialDetailScreen,
} from '../screens/requests/RequestMoreScreens';
import {
  VersionCompareScreen, EmergencyScreen, HazardReportScreen, HandoverLogScreen, HandoverDetailScreen,
} from '../screens/ops/SafetyScreens';
import { StateScreen } from '../screens/common/StateScreen';
import { FlowseAIScreen, AiReviewScreen, AiHistoryScreen } from '../screens/ai/FlowseAIScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcon =
  (Icon: LucideIcon) =>
  ({ color }: { color: string }) => <Icon size={24} color={color} />;

// Thanh tab theo vai trò (sheet 05): văn phòng vs hiện trường
const OFFICE_TABS = [
  { name: Routes.HOME, title: 'Hôm nay', icon: House, component: HomeScreen },
  { name: Routes.WORK_ITEMS, title: 'Công việc', icon: SquareCheckBig, component: WorkItemsScreen },
  { name: Routes.REQUESTS, title: 'Yêu cầu', icon: FileText, component: RequestsScreen },
  { name: Routes.INBOX, title: 'Hộp thư', icon: Inbox, component: InboxScreen },
  { name: Routes.PROFILE, title: 'Tôi', icon: CircleUser, component: ProfileScreen },
] as const;
const FIELD_TABS = [
  { name: Routes.HOME, title: 'Hôm nay', icon: House, component: HomeScreen },
  { name: Routes.QR_SCANNER, title: 'Quét QR', icon: ScanLine, component: QRScannerScreen },
  { name: Routes.INCIDENTS, title: 'Sự cố', icon: TriangleAlert, component: IncidentsScreen },
  { name: Routes.INBOX, title: 'Hộp thư', icon: Inbox, component: InboxScreen },
  { name: Routes.PROFILE, title: 'Tôi', icon: CircleUser, component: ProfileScreen },
] as const;

const MainTabs: React.FC = () => {
  const c = useColors();
  const field = useAuthStore((s) => s.capabilities.canExecuteRepair && !s.capabilities.canAssignWork);
  const tabs = field ? FIELD_TABS : OFFICE_TABS;
  const nav = useNavigation<any>();
  // A10: lần đầu vào app thì hỏi quyền một lần
  useEffect(() => {
    SecureStore.getItemAsync('perm_seen').then((seen) => {
      if (seen) return;
      SecureStore.setItemAsync('perm_seen', '1');
      nav.navigate(Routes.PERMISSIONS);
    });
  }, [nav]);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // Chuyển tab: nội dung trượt nhẹ + mờ (chạy native), không nháy trắng
        animation: 'shift',
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: text.tab,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      {tabs.map((t) => (
        <Tab.Screen key={t.name} name={t.name} component={t.component} options={{ title: t.title, tabBarIcon: tabIcon(t.icon) }} />
      ))}
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const c = useColors();
  const { token, checkAuth, isInitialized, logout } = useAuthStore();
  const expired = usePrefs((p) => p.sessionExpired);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  // A08: API trả 401 giữa phiên thì về Đăng nhập, màn Đăng nhập mở tiếp "Phiên đã hết hạn"
  useEffect(() => {
    if (expired && token) logout();
  }, [expired, token, logout]);

  if (!isInitialized) {
    return null; // chỉ trong tích tắc đọc phiên đăng nhập từ SecureStore
  }

  // Chuyển màn bằng animation native của iOS/Android (react-native-screens): mượt, không qua luồng JS
  const screenOptions: NativeStackNavigationOptions = {
    headerShown: false,
    animation: 'default',
    gestureEnabled: true,
    contentStyle: { backgroundColor: c.bg },
  };
  // Sheet (C08, C14, D02, D10, E08, G09, J08, J09): form sheet native có điểm dừng, kéo xuống để đóng
  const sheet: NativeStackNavigationOptions = {
    presentation: 'formSheet',
    sheetAllowedDetents: [0.75, 1],
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    contentStyle: { backgroundColor: c.bg },
  };

  return (
    <RootStack.Navigator screenOptions={screenOptions}>
      {!token ? (
        <>
          <RootStack.Screen name={Routes.LOGIN} component={LoginScreen} options={{ animation: 'fade' }} />
          <RootStack.Screen name={Routes.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
          <RootStack.Screen name={Routes.CHECK_EMAIL} component={CheckEmailScreen} />
          <RootStack.Screen name={Routes.NEW_PASSWORD} component={NewPasswordScreen} />
          <RootStack.Screen name={Routes.ACCOUNT_LOCKED} component={AccountLockedScreen} />
          <RootStack.Screen name={Routes.SESSION_EXPIRED} component={SessionExpiredScreen} />
        </>
      ) : (
        <>
          <RootStack.Screen name={Routes.MAIN_TABS} component={MainTabs} options={{ animation: 'fade' }} />
          <RootStack.Screen name={Routes.CONTEXT_SELECT} component={ContextSelectScreen} />
          <RootStack.Screen name={Routes.WORK_ITEM_DETAIL} component={WorkItemDetailScreen} />
          <RootStack.Screen name={Routes.CREATE_WORK_ITEM} component={CreateWorkItemScreen} />
          <RootStack.Screen name={Routes.COMMENTS} component={CommentsScreen} />
          <RootStack.Screen name={Routes.SPACES} component={SpacesScreen} />
          <RootStack.Screen name={Routes.SPACE_DETAIL} component={SpaceDetailScreen} />
          <RootStack.Screen name={Routes.ASSET_DETAIL} component={AssetDetailScreen} />
          <RootStack.Screen name={Routes.REPORT_INCIDENT} component={ReportIncidentScreen} />
          <RootStack.Screen name={Routes.INCIDENT_DETAIL} component={IncidentDetailScreen} />
          <RootStack.Screen name={Routes.INSPECTIONS} component={InspectionsScreen} />
          <RootStack.Screen name={Routes.INSPECTION_RUNNER} component={InspectionRunnerScreen} />
          <RootStack.Screen name={Routes.INSPECTION_RESULT} component={InspectionResultScreen} />
          <RootStack.Screen name={Routes.REQUEST_TYPES} component={RequestTypesScreen} />
          <RootStack.Screen name={Routes.REQUEST_FORM} component={RequestFormScreen} />
          <RootStack.Screen name={Routes.REQUEST_DETAIL} component={RequestDetailScreen} />
          <RootStack.Screen name={Routes.APPROVALS} component={ApprovalsScreen} />
          <RootStack.Screen name={Routes.APPROVAL_DECISION} component={ApprovalDecisionScreen} />
          <RootStack.Screen name={Routes.MATERIALS} component={MaterialsScreen} />
          <RootStack.Screen name={Routes.HANDOVER} component={HandoverScreen} />
          <RootStack.Screen name={Routes.SYNC_QUEUE} component={SyncQueueScreen} />
          <RootStack.Screen name={Routes.CHAT} component={ChatScreen} />
          <RootStack.Screen name={Routes.NOTIFICATION_SETTINGS} component={NotificationSettingsScreen} />
          <RootStack.Screen name={Routes.FLOWSE_AI} component={FlowseAIScreen} />
          <RootStack.Screen name={Routes.REPAIR_ORDER} component={RepairOrderScreen} />
          <RootStack.Screen name={Routes.HANDOVER_RECEIVE} component={HandoverReceiveScreen} />
          <RootStack.Screen name={Routes.MATERIAL_ISSUE} component={MaterialIssueScreen} />
          <RootStack.Screen name={Routes.PRODUCTION} component={ProductionScreen} />
          <RootStack.Screen name={Routes.SEARCH} component={SearchScreen} />
          <RootStack.Screen name={Routes.PERMISSIONS} component={PermissionsScreen} />
          <RootStack.Screen name={Routes.ROLE_PICKER} component={RolePickerScreen} />
          <RootStack.Screen name={Routes.LIST_VIEW} component={ListViewScreen} />
          <RootStack.Screen name={Routes.SUBTASKS} component={SubtasksScreen} />
          <RootStack.Screen name={Routes.REVIEW} component={ReviewScreen} />
          <RootStack.Screen name={Routes.PROJECT_DETAIL} component={ProjectDetailScreen} />
          <RootStack.Screen name={Routes.TEAM} component={TeamScreen} />
          <RootStack.Screen name={Routes.MEMBER_WORK} component={MemberWorkScreen} />
          <RootStack.Screen name={Routes.REASSIGN} component={ReassignScreen} />
          <RootStack.Screen name={Routes.UNITS} component={UnitsScreen} />
          <RootStack.Screen name={Routes.LINE_DETAIL} component={LineDetailScreen} />
          <RootStack.Screen name={Routes.FIELD_WORK} component={FieldWorkScreen} />
          <RootStack.Screen name={Routes.PM_LIST} component={PmListScreen} />
          <RootStack.Screen name={Routes.SOP} component={SopScreen} />
          <RootStack.Screen name={Routes.INSPECTION_SUBMIT} component={InspectionSubmitScreen} />
          <RootStack.Screen name={Routes.NCR_NEW} component={NcrNewScreen} />
          <RootStack.Screen name={Routes.NCR_DETAIL} component={NcrDetailScreen} />
          <RootStack.Screen name={Routes.LOT_TRACE} component={LotTraceScreen} />
          <RootStack.Screen name={Routes.REQUEST_EDIT} component={RequestEditScreen} />
          <RootStack.Screen name={Routes.DELEGATION} component={DelegationScreen} />
          <RootStack.Screen name={Routes.MATERIAL_REQUEST} component={MaterialRequestScreen} />
          <RootStack.Screen name={Routes.PURCHASE_UPDATE} component={PurchaseUpdateScreen} />
          <RootStack.Screen name={Routes.MATERIAL_DETAIL} component={MaterialDetailScreen} />
          <RootStack.Screen name={Routes.VERSION_COMPARE} component={VersionCompareScreen} />
          <RootStack.Screen name={Routes.EMERGENCY} component={EmergencyScreen} />
          <RootStack.Screen name={Routes.HAZARD_REPORT} component={HazardReportScreen} />
          <RootStack.Screen name={Routes.HANDOVER_LOG} component={HandoverLogScreen} />
          <RootStack.Screen name={Routes.HANDOVER_DETAIL} component={HandoverDetailScreen} />
          <RootStack.Screen name={Routes.APPEARANCE} component={AppearanceScreen} />
          <RootStack.Screen name={Routes.STATE} component={StateScreen} />
          <RootStack.Screen name={Routes.SCAN}>{({ navigation }) => <QRScannerScreen onBack={navigation.goBack} />}</RootStack.Screen>
          <RootStack.Screen name={Routes.AI_REVIEW} component={AiReviewScreen} />
          <RootStack.Screen name={Routes.AI_HISTORY} component={AiHistoryScreen} />
          <RootStack.Screen name={Routes.SUCCESS} component={SuccessScreen} options={{ animation: 'fade', gestureEnabled: false }} />
          <RootStack.Screen name={Routes.ASSIGN_SHEET} component={AssignSheet} options={sheet} />
          <RootStack.Screen name={Routes.INCIDENT_TRIAGE} component={IncidentTriageSheet} options={sheet} />
          <RootStack.Screen name={Routes.REJECT_REASON} component={RejectReasonSheet} options={sheet} />
          <RootStack.Screen name={Routes.PICK_PROJECT} component={PickProjectSheet} options={sheet} />
          <RootStack.Screen name={Routes.WORK_FILTER} component={WorkFilterSheet} options={sheet} />
          <RootStack.Screen name={Routes.SHIFT_TRANSFER} component={ShiftTransferSheet} options={sheet} />
          <RootStack.Screen name={Routes.NEW_MESSAGE} component={NewMessageSheet} options={sheet} />
          <RootStack.Screen name={Routes.CHANNEL_MEMBERS} component={ChannelMembersSheet} options={sheet} />
        </>
      )}
    </RootStack.Navigator>
  );
};
