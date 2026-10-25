import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing } from '../../../core/theme';
import { useAuthStore } from '../../state/authStore';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hồ sơ & Tài khoản (Profile)</Text>
      <Text style={styles.subtitle}>{user?.name} ({user?.email})</Text>
      <Text style={styles.desc}>
        Sẵn sàng nhận giao diện Figma (Thông tin cá nhân, phân quyền, cấu hình đồng bộ ngoại tuyến).
      </Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.neutral.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  desc: {
    ...typography.bodySecondary,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  logoutBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  logoutText: {
    ...typography.button,
    color: colors.semantic.error,
  },
});
