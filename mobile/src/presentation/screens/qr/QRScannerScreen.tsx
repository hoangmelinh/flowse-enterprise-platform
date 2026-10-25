import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing } from '../../../core/theme';

export const QRScannerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quét mã QR Thiết bị (QR Context Resolver)</Text>
      <Text style={styles.desc}>
        Sẵn sàng nhận giao diện Figma (Khung ngắm quét camera, giải mã Opaque Token, tải Context máy).
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
