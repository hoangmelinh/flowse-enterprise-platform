import React from 'react';
import { ActivityIndicator, View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { PressableScale } from './PressableScale';
import { radius, space, Colors, makeStyles, useColors } from '../../../core/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const textTone = { primary: 'bg', secondary: 'ink', danger: 'onAccent' } as const;

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const styles = useStyles();
  const c = useColors();
  const inactive = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={[styles.base, styles[variant], size === 'sm' && styles.sm, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={c[textTone[variant]]} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText variant="button" tone={textTone[variant]}>
            {title}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    base: {
      height: 52,
      borderRadius: radius.md,
      paddingHorizontal: space.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sm: { height: 44 },
    disabled: { opacity: 0.45 },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    primary: { backgroundColor: c.ink },
    danger: { backgroundColor: c.danger },
    // Nút phụ nổi trên nền m/bg: nền surface + viền mảnh + bóng nhẹ (đúng bản Figma đã chỉnh)
    secondary: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    },
  })
);
