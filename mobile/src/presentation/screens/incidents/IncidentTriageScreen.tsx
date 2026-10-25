import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing } from '../../../core/theme';

export const IncidentTriageScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phân loại & Điều phối Sự cố (Incident Triage)</Text>
      <Text style={styles.desc}>
        Sẵn sàng nhận giao diện Figma (Chỉ định kỹ thuật viên, đánh giá mức độ, đo SLA).
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
