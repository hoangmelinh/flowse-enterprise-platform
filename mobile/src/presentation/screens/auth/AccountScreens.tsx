import React, { useEffect, useState } from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { AtSign, Lock, Camera, Bell, MapPin, CircleCheck, Circle, FileText, ClipboardCheck, LucideIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { AppText, BottomBar, Button, EmptyState, Field, Group, Row, ScrollPage } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

// shortcut: backend chưa có API quên mật khẩu; các màn A04–A06 chạy theo luồng giao diện, nối /auth/forgot khi có

/** A04 — Quên mật khẩu. */
export const ForgotPasswordScreen: React.FC<ScreenProps<typeof Routes.FORGOT_PASSWORD>> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const ok = /\S+@\S+\.\S+/.test(email.trim());
  return (
    <ScrollPage
      title="Khôi phục truy cập"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Gửi liên kết" disabled={!ok} onPress={() => navigation.replace(Routes.CHECK_EMAIL, { email: email.trim() })} />
        </BottomBar>
      }
    >
      <AppText tone="muted">Nhập email công việc. Flowse gửi liên kết đặt lại mật khẩu, hiệu lực 30 phút.</AppText>
      <Field label="Email công việc" icon={AtSign} value={email} onChangeText={setEmail} placeholder="minhanh@anphat.vn" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
    </ScrollPage>
  );
};

/** A05 — Kiểm tra email (đếm ngược gửi lại). */
export const CheckEmailScreen: React.FC<ScreenProps<typeof Routes.CHECK_EMAIL>> = ({ route, navigation }) => {
  const [left, setLeft] = useState(42);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <ScrollPage
      title="Kiểm tra email"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Mở ứng dụng email" onPress={() => navigation.replace(Routes.NEW_PASSWORD)} />
          <Button title={left > 0 ? `Gửi lại sau 0:${String(left).padStart(2, '0')}` : 'Gửi lại'} variant="secondary" disabled={left > 0} onPress={() => setLeft(42)} />
        </BottomBar>
      }
    >
      <EmptyState icon={AtSign} title={`Đã gửi tới ${route.params.email}`} body="Mở liên kết trên điện thoại này. Không thấy thư? Kiểm tra mục Spam hoặc hỏi quản trị viên." />
    </ScrollPage>
  );
};

const Check: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => {
  const c = useColors();
  return (
    <View style={styles.check}>
      {ok ? <CircleCheck size={18} color={c.success} /> : <Circle size={18} color={c.muted} />}
      <AppText variant="caption" tone={ok ? 'success' : 'muted'}>{label}</AppText>
    </View>
  );
};

/** A06 — Đặt mật khẩu mới. */
export const NewPasswordScreen: React.FC<ScreenProps<typeof Routes.NEW_PASSWORD>> = ({ navigation }) => {
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const rules = { len: pw.length >= 10, digit: /\d/.test(pw), match: !!pw && pw === again };
  return (
    <ScrollPage
      title="Mật khẩu mới"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Lưu mật khẩu" disabled={!rules.len || !rules.digit || !rules.match} onPress={navigation.popToTop} />
        </BottomBar>
      }
    >
      <Field label="Mật khẩu mới" icon={Lock} value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Field label="Nhập lại" icon={Lock} value={again} onChangeText={setAgain} secureTextEntry invalid={!!again && !rules.match} />
      <View style={{ gap: space.sm }}>
        <Check ok={rules.len} label="10 ký tự trở lên" />
        <Check ok={rules.digit} label="Có chữ số" />
        <Check ok={rules.match} label="Hai lần nhập khớp nhau" />
      </View>
    </ScrollPage>
  );
};

/** A07 — Tài khoản tạm khoá sau 5 lần sai. */
export const AccountLockedScreen: React.FC<ScreenProps<typeof Routes.ACCOUNT_LOCKED>> = ({ navigation }) => (
  <ScrollPage
    title="Tạm khóa"
    onBack={navigation.goBack}
    footer={
      <BottomBar>
        <Button title="Đặt lại mật khẩu" onPress={() => navigation.replace(Routes.FORGOT_PASSWORD)} />
        <Button title="Liên hệ quản trị" variant="secondary" onPress={() => Linking.openURL('mailto:quantri@anphat.vn')} />
      </BottomBar>
    }
  >
    <EmptyState icon={Lock} title="Thử lại sau 14 phút" body="Có 5 lần đăng nhập sai liên tiếp lúc 08:12. Nếu không phải bạn, đặt lại mật khẩu ngay." />
  </ScrollPage>
);

/** A08 — Phiên hết hạn: bản nháp vẫn nằm trên máy. */
export const SessionExpiredScreen: React.FC<ScreenProps<typeof Routes.SESSION_EXPIRED>> = ({ navigation }) => (
  <ScrollPage
    title="Phiên đăng nhập đã hết hạn"
    onBack={navigation.goBack}
    footer={
      <BottomBar>
        <Button title="Đăng nhập lại" onPress={navigation.goBack} />
      </BottomBar>
    }
  >
    <AppText tone="muted">2 bản nháp vẫn nằm trên máy và sẽ gửi sau khi bạn đăng nhập lại.</AppText>
    <Group>
      <Row icon={FileText} title="Báo sự cố BT-07" subtitle="Lưu 09:18 · 2 ảnh" chevron={false} />
      <Row icon={ClipboardCheck} title="Checklist đóng gói ca sáng" subtitle="Lưu 09:26 · 6/6 mục" chevron={false} />
    </Group>
  </ScrollPage>
);

const PERMS: { icon: LucideIcon; title: string; sub: string }[] = [
  { icon: Camera, title: 'Camera', sub: 'Quét QR thiết bị, chụp ảnh sự cố' },
  { icon: Bell, title: 'Thông báo', sub: 'Việc được giao, sự cố, phê duyệt' },
  { icon: MapPin, title: 'Vị trí', sub: 'Gợi ý nhà máy gần bạn khi chọn nơi làm việc' },
];

/** A10 — Cho phép quyền lần đầu. */
export const PermissionsScreen: React.FC<ScreenProps<typeof Routes.PERMISSIONS>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  // shortcut: chỉ xin quyền camera (đã có expo-image-picker); thông báo/vị trí cần expo-notifications, expo-location
  const allow = async () => {
    await ImagePicker.requestCameraPermissionsAsync();
    navigation.goBack();
  };
  return (
    <ScrollPage
      title="Quyền truy cập"
      caption="Thiết lập lần đầu"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Cho phép" onPress={allow} />
          <Button title="Để sau" variant="secondary" onPress={navigation.goBack} />
        </BottomBar>
      }
    >
      <AppText variant="heading">Cho phép để làm việc tại hiện trường</AppText>
      <AppText tone="muted">Bạn có thể đổi lại bất cứ lúc nào trong Cài đặt của máy.</AppText>
      <View style={{ gap: space.md }}>
        {PERMS.map(({ icon: Icon, title, sub }) => (
          <View key={title} style={s.perm}>
            <View style={s.tile}>
              <Icon size={22} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{title}</AppText>
              <AppText variant="caption" tone="muted">{sub}</AppText>
            </View>
          </View>
        ))}
      </View>
    </ScrollPage>
  );
};

const styles = StyleSheet.create({
  check: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    perm: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    tile: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  })
);
