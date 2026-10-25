import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography, spacing, borderRadius } from '../../../core/theme';
import { SLAStatus } from '../../../domain/entities/workitem';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react-native';

interface SLABadgeProps {
  status: SLAStatus;
  deadlineAt: string;
}

export const SLABadge: React.FC<SLABadgeProps> = ({ status, deadlineAt }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      if (!deadlineAt) return;
      const diffMs = new Date(deadlineAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft('Đã quá hạn');
        return;
      }
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0) {
        setTimeLeft(`Còn ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`Còn ${minutes} phút`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  const getBadgeConfig = () => {
    switch (status) {
      case 'IN_SLA':
        return {
          bg: colors.sla.inSlaBg,
          text: colors.sla.inSla,
          label: 'Trong SLA',
          Icon: Clock,
        };
      case 'AT_RISK':
        return {
          bg: colors.sla.atRiskBg,
          text: colors.sla.atRisk,
          label: 'Nguy cơ trễ',
          Icon: AlertTriangle,
        };
      case 'BREACHED':
        return {
          bg: colors.sla.breachedBg,
          text: colors.sla.breached,
          label: 'Vi phạm SLA',
          Icon: AlertCircle,
        };
      case 'COMPLETED':
      default:
        return {
          bg: '#F1F5F9',
          text: '#64748B',
          label: 'Hoàn tất',
          Icon: CheckCircle2,
        };
    }
  };

  const config = getBadgeConfig();
  const IconComponent = config.Icon;

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.text }]}>
      <IconComponent size={14} color={config.text} style={styles.icon} />
      <Text style={[styles.label, { color: config.text }]}>
        {config.label}
        {timeLeft ? ` • ${timeLeft}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
});
