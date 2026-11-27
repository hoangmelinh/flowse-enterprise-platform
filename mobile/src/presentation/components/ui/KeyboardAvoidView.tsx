import React from 'react';
import { KeyboardAvoidingView, KeyboardAvoidingViewProps } from 'react-native';

/** Tự động nâng khung nhập liệu tránh bị bàn phím che trên cả iOS và Android (kể cả edge-to-edge). */
export const KeyboardAvoidView: React.FC<KeyboardAvoidingViewProps> = ({
  behavior = 'padding',
  style,
  children,
  ...rest
}) => (
  <KeyboardAvoidingView behavior={behavior} style={[{ flex: 1 }, style]} {...rest}>
    {children}
  </KeyboardAvoidingView>
);
