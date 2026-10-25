import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Routes } from '../../core/constants/routes';
import { RootStackParamList, MainTabParamList } from './types';
import { useAuthStore } from '../state/authStore';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { WorkItemsScreen } from '../screens/workitems/WorkItemsScreen';
import { WorkItemDetailScreen } from '../screens/workitems/WorkItemDetailScreen';
import { ReportIncidentScreen } from '../screens/incidents/ReportIncidentScreen';
import { IncidentTriageScreen } from '../screens/incidents/IncidentTriageScreen';
import { InspectionRunnerScreen } from '../screens/inspections/InspectionRunnerScreen';
import { QRScannerScreen } from '../screens/qr/QRScannerScreen';
import { ApprovalsScreen } from '../screens/approvals/ApprovalsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tab.Screen
        name={Routes.HOME}
        component={HomeScreen}
        options={{ title: 'Trang chủ' }}
      />
      <Tab.Screen
        name={Routes.WORK_ITEMS}
        component={WorkItemsScreen}
        options={{ title: 'Công việc' }}
      />
      <Tab.Screen
        name={Routes.QR_SCANNER}
        component={QRScannerScreen}
        options={{ title: 'Quét QR' }}
      />
      <Tab.Screen
        name={Routes.APPROVALS}
        component={ApprovalsScreen}
        options={{ title: 'Phê duyệt' }}
      />
      <Tab.Screen
        name={Routes.PROFILE}
        component={ProfileScreen}
        options={{ title: 'Hồ sơ' }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { token, initializeAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!isInitialized) {
    return null; // Or lightweight splash loading
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <RootStack.Screen name={Routes.LOGIN} component={LoginScreen} />
      ) : (
        <>
          <RootStack.Screen name={Routes.MAIN_TABS} component={MainTabs} />
          <RootStack.Screen
            name={Routes.WORK_ITEM_DETAIL}
            component={WorkItemDetailScreen}
            options={{ headerShown: true, title: 'Chi tiết công việc' }}
          />
          <RootStack.Screen
            name={Routes.REPORT_INCIDENT}
            component={ReportIncidentScreen}
            options={{ headerShown: true, title: 'Báo cáo sự cố' }}
          />
          <RootStack.Screen
            name={Routes.INCIDENT_TRIAGE}
            component={IncidentTriageScreen}
            options={{ headerShown: true, title: 'Điều phối sự cố' }}
          />
          <RootStack.Screen
            name={Routes.INSPECTION_RUNNER}
            component={InspectionRunnerScreen}
            options={{ headerShown: true, title: 'Thực hiện kiểm tra' }}
          />
        </>
      )}
    </RootStack.Navigator>
  );
};
