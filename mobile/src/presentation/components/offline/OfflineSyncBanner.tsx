import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing, borderRadius } from '../../../core/theme';
import { WifiOff, RefreshCw } from 'lucide-react-native';

interface OfflineSyncBannerProps {
  isOffline: boolean;
  pendingCount: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOffline,
  pendingCount,
  onSyncNow,
  isSyncing = false,
}) => {
  if (!isOffline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isOffline ? styles.offlineBg : styles.pendingBg]}>
      <View style={styles.leftRow}>
        <WifiOff size={16} color={colors.offline.bannerText} style={styles.icon} />
        <Text style={styles.bannerText}>
          {isOffline
            ? 'Đang ngoại tuyến. Dữ liệu sẽ lưu cục bộ.'
            : `${pendingCount} thao tác đang chờ đồng bộ...`}
        </Text>
      </View>

      {!isOffline && pendingCount > 0 && onSyncNow && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={onSyncNow}
          disabled={isSyncing}
        >
          <RefreshCw size={14} color="#FFFFFF" />
          <Text style={styles.syncButtonText}>{isSyncing ? 'Đang sync...' : 'Đồng bộ'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineBg: {
    backgroundColor: colors.offline.bannerBg,
  },
  pendingBg: {
    backgroundColor: '#92400E',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: spacing.sm,
  },
  bannerText: {
    color: colors.offline.bannerText,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    flex: 1,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
    gap: 4,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
  },
});
