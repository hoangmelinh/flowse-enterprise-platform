import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useColors } from '../../../core/theme';

/** Nền m/bg + vùng an toàn. Màn trong tab chỉ chừa mép trên (tab bar lo mép dưới). */
export const Screen: React.FC<{ children: React.ReactNode; edges?: Edge[] }> = ({ children, edges = ['top'] }) => {
  const c = useColors();
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: c.bg }]}>
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ root: { flex: 1 } });
