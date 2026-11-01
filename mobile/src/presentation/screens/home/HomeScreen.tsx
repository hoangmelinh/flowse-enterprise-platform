import React, { useMemo } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Circle, CircleAlert, SquareCheckBig, WifiOff, Stamp, FileText, Search } from 'lucide-react-native';
import { approvals, myRequests } from '../../../data/demo/fixtures';
import { useMyWork } from '../work/WorkScreens';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { dueBucket } from '../../../core/utils/dueDate';
import { WorkItem } from '../../../domain/entities/workitem';
import { useAuthStore } from '../../state/authStore';
import { usePrefs } from '../../state/prefsStore';
import { RoleHome } from './RoleHomes';
import { AIButton, AppText, Group, Row, EmptyState, FlowseMark, ScreenHeader, Screen, SectionHeader, IconButton } from '../../components/ui';


const dueLabel = (item: WorkItem) => {
  const bucket = dueBucket(item.dueDate);
  if (bucket === 'overdue') return { text: 'Quá hạn', tone: 'danger' as const };
  if (bucket === 'today') return { text: 'Hôm nay', tone: 'warning' as const };
  return { text: item.statusName || 'Đang mở', tone: 'muted' as const };
};

/** Trang chủ: B01 cho văn phòng, B02–B12 theo vai trò (chọn thử ở Tôi → Trang chủ theo vai trò). */
export const HomeScreen: React.FC = () => {
  const field = useAuthStore((s) => s.capabilities.canExecuteRepair && !s.capabilities.canAssignWork);
  const role = usePrefs((s) => s.homeRole) ?? (field ? 'KT' : 'VP');
  return role === 'VP' ? <OfficeHome /> : <RoleHome role={role} />;
};

/** B01 — Trang chủ "Hôm nay". */
const OfficeHome: React.FC = () => {
  const styles = useStyles();
  const c = useColors();
  const navigation = useNavigation<any>();
  const { user, currentWorkspace, capabilities } = useAuthStore();
  const { data = [], isLoading, isError, refetch, isRefetching } = useMyWork();

  const open = useMemo(() => data.filter((w) => !w.currentState?.isTerminal), [data]);
  const dueToday = open.filter((w) => dueBucket(w.dueDate) === 'today').length;
  const overdue = open.filter((w) => dueBucket(w.dueDate) === 'overdue').length;
  // Ưu tiên việc quá hạn, rồi đến hạn hôm nay
  const top = [...open]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 4);

  const firstName = (user?.name || '').trim().split(/\s+/).pop() || 'bạn';
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const caption = [today.charAt(0).toUpperCase() + today.slice(1), currentWorkspace?.name].filter(Boolean).join(' · ');

  return (
    <Screen>
      <ScreenHeader caption={caption} title={`Chào ${firstName}`} right={<IconButton icon={Search} label="Tìm kiếm" onPress={() => navigation.navigate(Routes.SEARCH)} />}
        titleRight={<AIButton onPress={() => navigation.navigate(Routes.FLOWSE_AI)} />} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.muted} />}
      >
        <View style={styles.today}>
          <View style={styles.flex}>
            <AppText variant="heading">
              {dueToday > 0 ? `${dueToday} việc đến hạn hôm nay` : 'Không có việc đến hạn hôm nay'}
            </AppText>
            <AppText variant="caption" tone={overdue > 0 ? 'danger' : 'muted'}>
              {overdue > 0 ? `${overdue} việc đã quá hạn` : `${open.length} việc đang mở`}
            </AppText>
          </View>
          <FlowseMark size={72} />
        </View>

        <View style={styles.section}>
          <AppText variant="section" accessibilityRole="header">
            Việc của tôi
          </AppText>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => navigation.navigate(Routes.WORK_ITEMS)}>
            <AppText variant="label" tone="accent">
              Xem tất cả
            </AppText>
          </Pressable>
        </View>

        {isLoading ? (
          <Group>
            <View style={styles.loading}>
              <ActivityIndicator color={c.muted} />
              <AppText variant="caption" tone="muted">
                Đang tải công việc…
              </AppText>
            </View>
          </Group>
        ) : isError ? (
          <EmptyState
            icon={WifiOff}
            title="Không tải được công việc"
            body="Kiểm tra kết nối mạng rồi thử lại."
            actionTitle="Thử lại"
            onAction={refetch}
          />
        ) : top.length === 0 ? (
          <EmptyState icon={SquareCheckBig} title="Chưa có công việc" body="Việc được giao cho bạn sẽ hiện ở đây." />
        ) : (
          <Group>
            {top.map((item) => {
              const due = dueLabel(item);
              return (
                <Row
                  key={item.id}
                  icon={due.tone === 'danger' ? CircleAlert : Circle}
                  iconTone={due.tone === 'danger' ? 'danger' : 'muted'}
                  title={item.title}
                  subtitle={due.text}
                  subtitleTone={due.tone}
                  onPress={() =>
                    navigation.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: item.id, title: item.title })
                  }
                />
              );
            })}
          </Group>
        )}

        {capabilities.canApprove ? (
          <Group>
            <Row icon={Stamp} iconTone="accent" title="Cần tôi duyệt" subtitle={`${approvals.length} phiếu đang chờ`} subtitleTone="warning" onPress={() => navigation.navigate(Routes.APPROVALS)} />
          </Group>
        ) : null}

        <SectionHeader title="Yêu cầu của tôi" count={myRequests.length} />
        <Group>
          {myRequests.slice(0, 2).map((r) => (
            <Row key={r.id} icon={FileText} title={r.title} subtitle={r.sub} subtitleTone={r.tone} onPress={() => navigation.navigate(Routes.REQUEST_DETAIL, { requestId: r.id })} />
          ))}
        </Group>
      </ScrollView>
    </Screen>
  );
};

const rank = (w: WorkItem) => ({ overdue: 0, today: 1, later: 2, none: 3 })[dueBucket(w.dueDate)];

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    content: { gap: space.xl, paddingTop: space.xs, paddingHorizontal: space.xl, paddingBottom: space.xxl },
    flex: { flex: 1, gap: space.xs },
    today: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.lg,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    loading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  })
);
