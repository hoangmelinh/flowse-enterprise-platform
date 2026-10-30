import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, SquareCheckBig, ScanLine, FileText, Inbox, TriangleAlert, CircleUser, LucideIcon } from 'lucide-react-native';
import { Routes } from '../../core/constants/routes';
import { text, useColors } from '../../core/theme';
import { RootStackParamList, MainTabParamList } from './types';
import { useAuthStore } from '../state/authStore';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { ContextSelectScreen } from '../screens/auth/ContextSelectScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SuccessScreen } from '../screens/common/SuccessScreen';
import { FlowseAIScreen } from '../screens/ai/FlowseAIScreen';
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
import { InboxScreen, ChatScreen, NotificationSettingsScreen } from '../screens/inbox/InboxScreens';

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
  const { token, checkAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
  // Sheet (C08, E08, G09): form sheet native có điểm dừng, kéo xuống để đóng
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
        <RootStack.Screen name={Routes.LOGIN} component={LoginScreen} options={{ animation: 'fade' }} />
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
          <RootStack.Screen name={Routes.SUCCESS} component={SuccessScreen} options={{ animation: 'fade', gestureEnabled: false }} />
          <RootStack.Screen name={Routes.ASSIGN_SHEET} component={AssignSheet} options={sheet} />
          <RootStack.Screen name={Routes.INCIDENT_TRIAGE} component={IncidentTriageSheet} options={sheet} />
          <RootStack.Screen name={Routes.REJECT_REASON} component={RejectReasonSheet} options={sheet} />
        </>
      )}
    </RootStack.Navigator>
  );
};
