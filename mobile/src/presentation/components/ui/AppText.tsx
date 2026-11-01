import React from 'react';
import { Text, TextProps } from 'react-native';
import { text, TextVariant, ColorToken, useColors } from '../../../core/theme';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: ColorToken;
}

export const AppText: React.FC<AppTextProps> = ({ variant = 'body', tone = 'ink', style, ...rest }) => {
  const c = useColors();
  return <Text {...rest} style={[text[variant], { color: c[tone] }, style]} />;
};
