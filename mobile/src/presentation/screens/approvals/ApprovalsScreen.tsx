import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing } from '../../../core/theme';

export const ApprovalsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trung tâm Phê duyệt (Approval Center)</Text>
      <Text style={styles.desc}>
        Sẵn sàng nhận giao diện Figma (Duyệt cấp phát vật tư hiện trường, kiểm tra tách biệt trách nhiệm).
      </Text>
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
  desc: {
    ...typography.bodySecondary,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
