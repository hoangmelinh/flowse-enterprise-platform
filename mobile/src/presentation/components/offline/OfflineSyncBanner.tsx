import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { radius, space, useColors } from '../../../core/theme';
import { AppText } from '../ui';

interface OfflineSyncBannerProps {
  isOffline: boolean;
  pendingCount: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

/** I03 / I04 — mất mạng hoặc còn thao tác chờ đồng bộ. */
export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOffline,
  pendingCount,
  onSyncNow,
  isSyncing = false,
}) => {
  const c = useColors();
  if (!isOffline && pendingCount === 0) {
    return null;
  }

  return (
    <View accessibilityRole="alert" style={[styles.container, { backgroundColor: c.warningSoft }]}>
      <WifiOff size={16} color={c.warning} />
      <AppText variant="label" tone="warning" style={styles.flex}>
        {isOffline ? 'Đang ngoại tuyến. Thao tác được giữ trên máy.' : `${pendingCount} thao tác đang chờ đồng bộ`}
      </AppText>
      {!isOffline && pendingCount > 0 && onSyncNow && (
        <Pressable accessibilityRole="button" onPress={onSyncNow} disabled={isSyncing} hitSlop={8} style={styles.sync}>
          <RefreshCw size={14} color={c.warning} />
          <AppText variant="label" tone="warning">
            {isSyncing ? 'Đang gửi…' : 'Đồng bộ'}
          </AppText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 14,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
  flex: { flex: 1 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
