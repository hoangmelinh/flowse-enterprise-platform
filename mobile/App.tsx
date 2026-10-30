import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
// Import từng kiểu chữ để chỉ đóng gói 4 file font đang dùng (gói gốc kéo theo cả 18 file)
import { BeVietnamPro_400Regular } from '@expo-google-fonts/be-vietnam-pro/400Regular';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { useColors } from './src/core/theme';
import { LaunchScreen } from './src/presentation/components/launch/LaunchScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
  });
  const scheme = useColorScheme();
  const c = useColors();
  const [launchDone, setLaunchDone] = useState(false);

  if (!fontsLoaded) return null;

  // Nền điều hướng = m/bg để không chớp trắng khi chuyển màn ở chế độ Tối
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.bg, text: c.ink, border: c.line, primary: c.accent },
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
        {/* A00 → A01b: hoạt ảnh mở app, phủ lên trên rồi mờ dần vào Đăng nhập */}
        {!launchDone && <LaunchScreen onDone={() => setLaunchDone(true)} />}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
