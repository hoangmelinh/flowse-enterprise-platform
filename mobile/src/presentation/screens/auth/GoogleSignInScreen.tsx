import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { space, radius, Colors, makeStyles } from '../../../core/theme';
import config from '../../../core/config';
import { Routes } from '../../../core/constants/routes';
import { useAuthStore } from '../../state/authStore';
import { AppText, Avatar, Banner, BottomBar, Button, PressableScale, ScrollPage } from '../../components/ui';
import { GoogleDoor } from '../../components/anim/GoogleDoor';
import { ScreenProps } from '../../navigation/types';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_IDS = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
};
// Google chặn đăng nhập trong app bằng Client ID loại Web; điện thoại cần Client ID iOS/Android (và bản dev build)
const NATIVE_ID = Platform.OS === 'ios' ? CLIENT_IDS.iosClientId : CLIENT_IDS.androidClientId;

type Phase = 'opening' | 'choose' | 'signing';

/**
 * A11 — Đăng nhập bằng Google: hoạt ảnh mở cửa, rồi chọn tài khoản Google, rồi Flowse đăng nhập.
 * Đăng nhập xong, navigator tự chuyển sang app vì đã có token.
 * Chế độ xem thử: không gọi Google, chọn tài khoản mẫu.
 */
export const GoogleSignInScreen: React.FC<ScreenProps<typeof Routes.GOOGLE_SIGNIN>> = ({ navigation }) => {
  const s = useStyles();
  const { loginWithGoogle, error } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('opening');
  // error của store dùng chung với màn Đăng nhập; chỉ hiện khi chính lần đăng nhập Google này thất bại
  const [failed, setFailed] = useState(false);
  const opened = phase !== 'opening';

  const signIn = async (idToken: string) => {
    setPhase('signing');
    setFailed(false);
    if (!(await loginWithGoogle(idToken))) {
      setFailed(true);
      setPhase('choose');
    }
  };

  return (
    <ScrollPage
      title="Đăng nhập bằng Google"
      caption="Flowse"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Dùng email công việc" variant="secondary" onPress={navigation.goBack} />
        </BottomBar>
      }
    >
      <GoogleDoor onOpened={() => setPhase((p) => (p === 'opening' ? 'choose' : p))} />
      <View style={s.copy}>
        <AppText variant="heading" style={s.center}>
          {phase === 'opening' ? 'Đang mở cửa Google…' : phase === 'signing' ? 'Đang đăng nhập Flowse…' : 'Chọn tài khoản Google'}
        </AppText>
        <AppText variant="caption" tone="muted" style={s.center}>
          Flowse chỉ nhận tên và email của bạn. Email phải là email công việc đã được mời vào nơi làm việc.
        </AppText>
      </View>
      {failed && error ? <Banner tone="danger" text={error} /> : null}
      {opened ? (
        <Animated.View entering={FadeInDown.duration(260)}>
          {config.demo ? (
            <DemoAccount disabled={phase === 'signing'} onPick={() => signIn('demo-google-token')} />
          ) : NATIVE_ID ? (
            <RealGoogle busy={phase === 'signing'} onToken={signIn} />
          ) : (
            <Banner
              tone="warning"
              text="Ứng dụng chưa có Client ID Google cho điện thoại (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / ANDROID_CLIENT_ID). Đăng nhập bằng email công việc trong lúc chờ."
            />
          )}
        </Animated.View>
      ) : null}
    </ScrollPage>
  );
};

/** Tài khoản mẫu khi chạy demo, trình bày như dòng chọn tài khoản của Google. */
const DemoAccount: React.FC<{ onPick: () => void; disabled: boolean }> = ({ onPick, disabled }) => {
  const s = useStyles();
  return (
    <PressableScale accessibilityRole="button" disabled={disabled} onPress={onPick} scaleTo={0.98} style={s.account}>
      <Avatar name="Nguyễn Minh Anh" size={40} bg="accentSoft" />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMedium">Nguyễn Minh Anh</AppText>
        <AppText variant="caption" tone="muted">minhanh@anphat.vn</AppText>
      </View>
      <AppText variant="label" tone="accent">{disabled ? 'Đang vào…' : 'Tiếp tục'}</AppText>
    </PressableScale>
  );
};

/** Mở trang chọn tài khoản của Google; nhận id_token rồi giao cho Flowse. Chỉ dựng khi đã có Client ID của nền tảng. */
const RealGoogle: React.FC<{ onToken: (idToken: string) => void; busy: boolean }> = ({ onToken, busy }) => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(CLIENT_IDS);
  useEffect(() => {
    if (response?.type === 'success' && response.params.id_token) onToken(response.params.id_token);
  }, [response]);
  return (
    <Button
      title={busy ? 'Đang đăng nhập…' : 'Chọn tài khoản Google'}
      loading={busy}
      disabled={!request || busy}
      onPress={() => promptAsync()}
    />
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    copy: { gap: space.sm, paddingHorizontal: space.md },
    center: { textAlign: 'center' },
    account: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
  })
);
