import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing, borderRadius } from '../../../core/theme';
import { WorkflowTransition } from '../../../domain/entities/workitem';
import { ArrowRightCircle } from 'lucide-react-native';

interface WorkflowTransitionBarProps {
  transitions: WorkflowTransition[];
  onTransition: (transition: WorkflowTransition) => void;
  isLoading?: boolean;
}

export const WorkflowTransitionBar: React.FC<WorkflowTransitionBarProps> = ({
  transitions,
  onTransition,
  isLoading = false,
}) => {
  if (!transitions || transitions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Hành động chuyển bước quy trình:</Text>
      <View style={styles.buttonRow}>
        {transitions.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.transitionButton, { backgroundColor: t.toStateColor || colors.primary }]}
            onPress={() => onTransition(t)}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>{t.transitionName}</Text>
                <ArrowRightCircle size={16} color="#FFFFFF" style={styles.icon} />
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.base,
    backgroundColor: colors.neutral.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral.cardBorder,
    marginVertical: spacing.md,
  },
  headerTitle: {
    color: colors.neutral.textSecondary,
    fontSize: typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  transitionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    minHeight: 44, // Chuẩn One-thumb touch target >= 44pt
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.fontSize.sm,
    marginRight: 6,
  },
  icon: {
    marginLeft: 2,
  },
});
