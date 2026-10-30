import React, { useState } from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { radius, space, text, Colors, makeStyles, useColors } from '../../../core/theme';
import { AppText } from './AppText';

interface FieldProps extends TextInputProps {
  label: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  invalid?: boolean;
}

export const Field: React.FC<FieldProps> = ({ label, icon: Icon, right, invalid = false, ...input }) => {
  const styles = useStyles();
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const borderColor = invalid ? c.danger : focused ? c.accent : c.line;

  return (
    <View style={styles.field}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <View style={[styles.box, { borderColor }]}>
        {Icon && <Icon size={18} color={c.muted} />}
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={c.muted}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {right}
      </View>
    </View>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    field: { gap: 6 },
    box: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      borderWidth: 1,
      backgroundColor: c.surface,
    },
    input: { ...text.body, flex: 1, color: c.ink, paddingVertical: space.sm },
  })
);
