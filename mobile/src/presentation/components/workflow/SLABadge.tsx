import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { space, radius, useColors } from '../../../core/theme';
import { SLAStatus } from '../../../domain/entities/workitem';
import { Clock, TriangleAlert, CircleAlert, CircleCheck } from 'lucide-react-native';
import { AppText } from '../ui';

interface SLABadgeProps {
  status: SLAStatus;
  deadlineAt: string;
}

export const SLABadge: React.FC<SLABadgeProps> = ({ status, deadlineAt }) => {
  const c = useColors();
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

  const config = BADGE[status] ?? BADGE.COMPLETED;
  const IconComponent = config.Icon;

  return (
    <View style={[styles.container, { backgroundColor: c[config.bg] }]}>
      <IconComponent size={14} color={c[config.tone]} />
      <AppText variant="label" tone={config.tone}>
        {config.label}
        {timeLeft && status !== 'COMPLETED' ? ` · ${timeLeft}` : ''}
      </AppText>
    </View>
  );
};

const BADGE = {
  IN_SLA: { bg: 'successSoft', tone: 'success', label: 'Trong SLA', Icon: Clock },
  AT_RISK: { bg: 'warningSoft', tone: 'warning', label: 'Nguy cơ trễ', Icon: TriangleAlert },
  BREACHED: { bg: 'dangerSoft', tone: 'danger', label: 'Vi phạm SLA', Icon: CircleAlert },
  COMPLETED: { bg: 'subtle', tone: 'muted', label: 'Hoàn tất', Icon: CircleCheck },
} as const;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
});
