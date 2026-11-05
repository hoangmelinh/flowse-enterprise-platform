import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ClipboardCheck, WifiOff } from 'lucide-react-native';
import { Routes } from '../../../core/constants/routes';
import { AppText, Avatar, Banner, BottomBar, Button, EmptyState, Field, Group, KV, Row, ScrollPage } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';
import { useApprovals, useApprovalDecision } from '../../state/useApprovals';

export const LiveApprovalsScreen: React.FC<ScreenProps<typeof Routes.APPROVALS>> = ({ navigation }) => {
  const { data = [], isLoading, isError, error, refetch, isRefetching } = useApprovals();
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  return (
    <ScrollPage title="Duyệt" caption={`${data.length} phiếu chờ xử lý`} onBack={navigation.goBack}
      refreshing={isRefetching} onRefresh={() => { void refetch(); }}>
      {isLoading ? <ActivityIndicator accessibilityLabel="Đang tải phiếu phê duyệt" /> : isError ? (
        <EmptyState icon={WifiOff} title="Không tải được phiếu" body={error?.message} actionTitle="Thử lại" onAction={refetch} />
      ) : data.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Không có phiếu chờ duyệt" body="Phiếu cần bạn xử lý sẽ xuất hiện ở đây." />
      ) : (
        <Group>
          {data.map((a) => <Row key={a.id} leading={<Avatar name={a.requesterName} size={28} />}
            title={a.taskTitle} subtitle={`${a.requesterName} · Bước ${a.stepOrder}`}
            onPress={() => navigation.navigate(Routes.APPROVAL_DECISION, { approvalId: a.id })} />)}
        </Group>
      )}
    </ScrollPage>
  );
};

export const LiveApprovalDecisionScreen: React.FC<ScreenProps<typeof Routes.APPROVAL_DECISION>> = ({ route, navigation }) => {
  const live = useApprovalDecision(route.params.approvalId);
  const { approval: a, decision, busy, canDecide, refetch } = live;
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  return (
    <ScrollPage title="Phê duyệt" caption={`Phiếu #${route.params.approvalId}`} onBack={navigation.goBack}
      refreshing={live.isRefetching} onRefresh={live.refresh}
      footer={canDecide ? (
        <BottomBar>
          <Button title="Duyệt" disabled={busy} loading={busy} onPress={() => live.submit('APPROVED', undefined, () => {
            navigation.replace(Routes.SUCCESS, { title: `Đã duyệt phiếu #${route.params.approvalId}`, body: 'Quyết định đã được ghi nhận.', kind: 'Phê duyệt', code: `#${route.params.approvalId}`, anim: 'stamp' });
          })} />
          <Button title="Từ chối" variant="secondary" disabled={busy} onPress={() => {
            if (!busy) navigation.navigate(Routes.REJECT_REASON, { approvalId: route.params.approvalId });
          }} />
        </BottomBar>
      ) : undefined}>
      {decision.error ? <Banner tone="danger" text={decision.error.message} /> : null}
      {decision.error ? <Button title="Tải lại danh sách" variant="secondary" disabled={busy} onPress={live.refresh} /> : null}
      {live.isLoading ? <ActivityIndicator accessibilityLabel="Đang tải phiếu phê duyệt" /> : live.isError ? (
        <EmptyState icon={WifiOff} title="Không tải được phiếu" body={live.error?.message} actionTitle="Thử lại" onAction={live.refresh} />
      ) : !a ? (
        <EmptyState icon={ClipboardCheck} title="Phiếu không còn chờ bạn duyệt" body="Phiếu đã được xử lý hoặc bạn không còn quyền xử lý phiếu này." />
      ) : (
        <>
          <AppText variant="title">{a.taskTitle}</AppText>
          <AppText tone="muted">{a.requesterName}</AppText>
          <Group>
            <KV label="Bước duyệt" value={String(a.stepOrder)} />
            <KV label="Trạng thái" value="Chờ duyệt" />
          </Group>
          {a.taskDescription ? <AppText>{a.taskDescription}</AppText> : null}
          {a.requestNote ? <AppText>{a.requestNote}</AppText> : null}
          <AppText variant="caption" tone="muted">Cần kết nối mạng để ghi nhận quyết định.</AppText>
        </>
      )}
    </ScrollPage>
  );
};

export const LiveRejectReasonSheet: React.FC<ScreenProps<typeof Routes.REJECT_REASON>> = ({ route, navigation }) => {
  const live = useApprovalDecision(route.params.approvalId);
  const { approval, decision, busy, canDecide } = live;
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  return (
    <ScrollPage title="Từ chối" caption={`Phiếu #${route.params.approvalId}`} onBack={navigation.goBack}>
      {decision.error ? <Banner tone="danger" text={decision.error.message} /> : null}
      {decision.error ? <Button title="Tải lại danh sách" variant="secondary" disabled={busy} onPress={live.refresh} /> : null}
      {live.isLoading ? <ActivityIndicator accessibilityLabel="Đang tải phiếu phê duyệt" /> : live.isError ? (
        <EmptyState icon={WifiOff} title="Không tải được phiếu" body={live.error?.message} actionTitle="Thử lại" onAction={live.refresh} />
      ) : !approval ? (
        <EmptyState icon={ClipboardCheck} title="Phiếu không còn chờ bạn duyệt" body="Vui lòng quay lại danh sách phê duyệt." />
      ) : (
        <>
          <AppText variant="bodyMedium">{approval.taskTitle}</AppText>
          <Field label="Lý do từ chối (bắt buộc)" value={reason} onChangeText={setReason} multiline editable={!busy}
            invalid={tried && !reason.trim()} hint="Nhập lý do trước khi từ chối." />
          {canDecide ? <Button title="Từ chối yêu cầu" variant="danger" disabled={busy} loading={busy} onPress={() => {
            setTried(true);
            if (!reason.trim() || busy) return;
            live.submit('REJECTED', reason.trim(), () => {
              navigation.replace(Routes.SUCCESS, { title: `Đã từ chối phiếu #${route.params.approvalId}`, body: 'Quyết định và lý do đã được ghi nhận.', kind: 'Phê duyệt', code: `#${route.params.approvalId}` });
            });
          }} /> : null}
        </>
      )}
    </ScrollPage>
  );
};
