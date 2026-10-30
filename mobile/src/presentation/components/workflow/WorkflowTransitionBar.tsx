import React from 'react';
import { View, StyleSheet } from 'react-native';
import { space } from '../../../core/theme';
import { WorkflowTransition } from '../../../domain/entities/workitem';
import { Button } from '../ui';

interface WorkflowTransitionBarProps {
  transitions: WorkflowTransition[];
  onTransition: (transition: WorkflowTransition) => void;
  isLoading?: boolean;
}

/** Các bước chuyển trạng thái: bước đầu là hành động chính, các bước khác là nút phụ. */
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
      {transitions.map((t, i) => (
        <Button
          key={t.id}
          title={t.transitionName}
          variant={i === 0 ? 'primary' : 'secondary'}
          loading={isLoading && i === 0}
          disabled={isLoading}
          onPress={() => onTransition(t)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: space.sm },
});
