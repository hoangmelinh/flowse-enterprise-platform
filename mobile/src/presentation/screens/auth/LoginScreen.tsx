import React, { useState } from 'react';
import { View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { AtSign, Lock, Eye, EyeOff } from 'lucide-react-native';
import { space, Colors, makeStyles, useColors } from '../../../core/theme';
import config from '../../../core/config';
import { useAuthStore } from '../../state/authStore';
import { AppText, Button, Field, Banner, FlowseWordmark, GoogleLogo, Screen } from '../../components/ui';

/** A02 / A03 — Đăng nhập (Flowse 2.0). */
export const LoginScreen: React.FC = () => {
  const styles = useStyles();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuthStore();

  const canSubmit = !!email.trim() && !!password && !isLoading;
  const submit = () => {
    if (canSubmit) login(email.trim(), password);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FlowseWordmark />
          <View style={styles.titles}>
            <AppText variant="title" accessibilityRole="header">
              Đăng nhập
            </AppText>
            <AppText tone="muted">Dùng tài khoản công ty được cấp.</AppText>
          </View>

          {config.demo ? <Banner text="Chế độ xem thử: nhập email và mật khẩu bất kỳ để vào app." /> : null}
          {error ? <Banner tone="danger" text={error} /> : null}

          <Field
            label="Email công việc"
            icon={AtSign}
            value={email}
            onChangeText={setEmail}
            invalid={!!error}
            placeholder="ten@congty.vn"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />
          <Field
            label="Mật khẩu"
            icon={Lock}
            value={password}
            onChangeText={setPassword}
            invalid={!!error}
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                hitSlop={12}
                onPress={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={18} color={c.muted} /> : <Eye size={18} color={c.muted} />}
              </Pressable>
            }
          />

          {/* shortcut: backend chưa có API quên mật khẩu, nên hướng dẫn liên hệ quản trị (như A07); làm A04–A06 khi có API */}
          <Pressable
            accessibilityRole="link"
            style={styles.forgot}
            onPress={() => Alert.alert('Quên mật khẩu', 'Liên hệ quản trị viên công ty để đặt lại mật khẩu.')}
          >
            <AppText variant="label" tone="accent">
              Quên mật khẩu?
            </AppText>
          </Pressable>
        </ScrollView>

        <View style={styles.actions}>
          <Button title="Đăng nhập" onPress={submit} loading={isLoading} disabled={!canSubmit} />
          {/* shortcut: mobile chưa nối Google Sign-In (backend đã có POST /auth/google), cần expo-auth-session + client ID */}
          <Button
            title="Tiếp tục với Google"
            variant="secondary"
            icon={<GoogleLogo />}
            onPress={() => Alert.alert('Đăng nhập Google', 'Tính năng đang được kết nối trên ứng dụng di động.')}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { gap: space.xl, paddingTop: space.xs, paddingHorizontal: space.xl, paddingBottom: space.xxl },
    titles: { gap: space.xs },
    forgot: { alignSelf: 'flex-end', paddingVertical: space.xs },
    actions: {
      gap: space.sm,
      paddingTop: space.md,
      paddingHorizontal: space.xl,
      paddingBottom: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      backgroundColor: c.bg,
    },
  })
);
