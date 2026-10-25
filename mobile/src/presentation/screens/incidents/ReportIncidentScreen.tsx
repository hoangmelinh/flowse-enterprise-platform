import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing } from '../../../core/theme';

export const ReportIncidentScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Báo cáo Sự cố Hiện trường (Report Incident)</Text>
      <Text style={styles.desc}>
        Sẵn sàng nhận giao diện Figma (Chụp ảnh bằng chứng, chọn mức độ P1-P4, nhập triệu chứng).
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
