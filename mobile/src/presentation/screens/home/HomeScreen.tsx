import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing, borderRadius } from '../../../core/theme';
import { useAuthStore } from '../../state/authStore';

export const HomeScreen: React.FC = () => {
  const { user, currentWorkspace, logout } = useAuthStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Xin chào, {user?.name || 'Người dùng'} 👋</Text>
        <Text style={styles.workspaceText}>
          {currentWorkspace?.name || 'Doanh nghiệp Flowse'}
        </Text>
      </View>

      <View style={styles.placeholderCard}>
        <Text style={styles.cardTitle}>📱 Giao diện Trang Chủ (Home Dashboard)</Text>
        <Text style={styles.cardDesc}>
          Toàn bộ cấu trúc giao diện đã được dọn sạch sẽ. Sẵn sàng nhận bản thiết kế Figma từ bạn để triển khai các component:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Quick Action Matrix (Quét QR, Báo sự cố, Checklist)</Text>
          <Text style={styles.listItem}>• Danh sách công việc hôm nay (My Work Today)</Text>
          <Text style={styles.listItem}>• Thống kê Downtime & Sự cố trong ca</Text>
          <Text style={styles.listItem}>• Trạng thái đồng bộ ngoại tuyến (Offline Banner)</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Đăng xuất tạm thời</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    paddingVertical: spacing.md,
  },
  welcomeText: {
    ...typography.h2,
    color: colors.neutral.textPrimary,
  },
  workspaceText: {
    ...typography.bodySecondary,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  placeholderCard: {
    backgroundColor: colors.neutral.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.neutral.textPrimary,
  },
  cardDesc: {
    ...typography.body,
    color: colors.neutral.textSecondary,
    lineHeight: 22,
  },
  list: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  listItem: {
    ...typography.bodySecondary,
    color: colors.neutral.textMuted,
  },
  logoutBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.surface,
    borderWidth: 1,
    borderColor: colors.neutral.divider,
  },
  logoutText: {
    ...typography.button,
    color: colors.semantic.error,
  },
});
