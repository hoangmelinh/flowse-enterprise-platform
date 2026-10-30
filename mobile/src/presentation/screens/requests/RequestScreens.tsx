import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Circle, CircleCheck, Clock, ClipboardCheck, FileText, CircleX } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import {
  approvalLines, approvals, checklist, inspections, myRequests, requestForms, requestSteps, requestTypes,
} from '../../../data/demo/fixtures';
import {
  AppText, Banner, BottomBar, Button, Chips, Fab, Field, Group, KV, PressableScale, Row, Screen, ScreenHeader, ScrollPage, SectionHeader, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

/* ───────── F · Kiểm tra chất lượng ───────── */

/** F01 — Kiểm tra được giao. */
export const InspectionsScreen: React.FC<ScreenProps<typeof Routes.INSPECTIONS>> = ({ navigation }) => (
  <ScrollPage title="Kiểm tra" caption="Hôm nay · QA/QC" onBack={navigation.goBack}>
    <Group>
      {inspections.map((i) => (
        <Row key={i.id} icon={ClipboardCheck} title={i.title} subtitle={`${i.code} · ${i.sub}`} trailing={<Tag label={i.due} tone={i.tone} />} chevron={false} onPress={() => navigation.navigate(Routes.INSPECTION_RUNNER, { inspectionId: i.id })} />
      ))}
    </Group>
  </ScrollPage>
);

/** F02 / F03 / F04 — Thực hiện checklist một tay; gửi khi đã trả lời đủ. */
export const InspectionRunnerScreen: React.FC<ScreenProps<typeof Routes.INSPECTION_RUNNER>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [ans, setAns] = useState<Record<number, boolean>>({});
  const done = Object.keys(ans).length;
  const missing = checklist.length - done;
  return (
    <ScrollPage
      title="Kiểm tra lô vải 24"
      caption={`QC-2610-018 · ${done}/${checklist.length} mục`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title={missing ? `Còn ${missing} mục chưa kiểm tra` : 'Gửi kết quả'}
            disabled={missing > 0}
            onPress={() => navigation.replace(Routes.INSPECTION_RESULT, { passed: Object.values(ans).filter(Boolean).length, total: checklist.length })}
          />
        </BottomBar>
      }
    >
      {done > 0 && missing > 0 ? <Banner tone="warning" text={`Còn ${missing} mục chưa kiểm tra. Kết quả sẽ khoá sau khi gửi.`} /> : null}
      {checklist.map((q, i) => (
        <View key={q} style={s.check}>
          <AppText variant="bodyMedium">{`${i + 1}. ${q}`}</AppText>
          <View style={s.pair}>
            {[true, false].map((v) => {
              const on = ans[i] === v;
              const tone = v ? c.success : c.danger;
              return (
                <PressableScale
                  key={String(v)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setAns((a) => ({ ...a, [i]: v }))}
                  style={[s.answer, on && { backgroundColor: v ? c.successSoft : c.dangerSoft, borderColor: tone }]}
                >
                  {v ? <CircleCheck size={18} color={on ? tone : c.muted} /> : <CircleX size={18} color={on ? tone : c.muted} />}
                  <AppText variant="label" tone={on ? (v ? 'success' : 'danger') : 'muted'}>
                    {v ? 'Đạt' : 'Không đạt'}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollPage>
  );
};

/** F05 — Kết quả kiểm tra (đã khoá). */
export const InspectionResultScreen: React.FC<ScreenProps<typeof Routes.INSPECTION_RESULT>> = ({ route, navigation }) => {
  const { passed, total } = route.params;
  const ok = passed === total;
  return (
    <ScrollPage
      title="Kết quả"
      caption="QC-2610-018 · đã khoá"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          {!ok && <Button title="Ghi nhận không phù hợp (NCR)" variant="danger" onPress={() => navigation.popToTop()} />}
          <Button title="Về trang chủ" variant={ok ? 'primary' : 'secondary'} onPress={() => navigation.popToTop()} />
        </BottomBar>
      }
    >
      <Banner tone={ok ? 'accent' : 'danger'} text={`${ok ? 'Đạt' : 'Chưa đạt'} · ${passed}/${total} tiêu chí đạt`} />
      <Group>
        <KV label="Người kiểm tra" value="Trần Thị Ngọc" />
        <KV label="Lô" value="Vải 24 · QC đầu vào" />
        <KV label="Thời điểm khoá" value={new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} />
      </Group>
      {!ok ? <AppText variant="caption" tone="muted">Flowse đã tạo việc khắc phục cho Tổ an toàn.</AppText> : null}
    </ScrollPage>
  );
};

/* ───────── G · Yêu cầu & phê duyệt ───────── */

/** G01 — Yêu cầu của tôi (tab văn phòng). */
export const RequestsScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [f, setF] = useState('Đang mở');
  const list = f === 'Cần bổ sung' ? myRequests.filter((r) => r.tone === 'danger') : f === 'Đã xong' ? [] : myRequests;
  return (
    <Screen>
      <ScreenHeader title="Yêu cầu" caption="Phòng Kế hoạch" />
      <ScrollView contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.xl, paddingBottom: 100 }}>
        <Chips items={['Đang mở', 'Cần bổ sung', 'Đã xong']} value={f} onChange={setF} />
        <Group>
          {list.map((r) => (
            <Row key={r.id} icon={FileText} title={r.title} subtitle={r.sub} subtitleTone={r.tone} onPress={() => nav.navigate(Routes.REQUEST_DETAIL, { requestId: r.id })} />
          ))}
        </Group>
      </ScrollView>
      <Fab label="Yêu cầu mới" onPress={() => nav.navigate(Routes.REQUEST_TYPES)} />
    </Screen>
  );
};

/** G02 — Bạn cần gì? */
export const RequestTypesScreen: React.FC<ScreenProps<typeof Routes.REQUEST_TYPES>> = ({ navigation }) => (
  <ScrollPage title="Bạn cần gì?" caption="Yêu cầu mới" onBack={navigation.goBack}>
    <Group>
      {requestTypes.map((t) => (
        <Row key={t.key} icon={FileText} title={t.name} subtitle={t.sub} onPress={() => navigation.navigate(Routes.REQUEST_FORM, { typeKey: t.key })} />
      ))}
    </Group>
  </ScrollPage>
);

/** G03 / G03b–e — Form tạo yêu cầu theo loại. */
export const RequestFormScreen: React.FC<ScreenProps<typeof Routes.REQUEST_FORM>> = ({ route, navigation }) => {
  const form = requestForms[route.params.typeKey] ?? requestForms.leave;
  const [values, setValues] = useState<Record<string, string>>({});
  const ready = form.fields.every((f) => values[f.label]?.trim());
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollPage
        title={form.title}
        caption="Yêu cầu mới"
        onBack={navigation.goBack}
        footer={
          <BottomBar>
            <Button
              title="Gửi yêu cầu"
              disabled={!ready}
              onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã gửi yêu cầu', body: form.note, kind: form.title, code: 'YC-2610-052' })}
            />
            <Button title="Lưu nháp" variant="secondary" onPress={navigation.goBack} />
          </BottomBar>
        }
      >
        {form.fields.map((f) => (
          <Field key={f.label} label={f.label} placeholder={f.placeholder} value={values[f.label] ?? ''} onChangeText={(v) => setValues((x) => ({ ...x, [f.label]: v }))} />
        ))}
        <AppText variant="caption" tone="muted">{form.note}</AppText>
      </ScrollPage>
    </KeyboardAvoidingView>
  );
};

/** G04 / G06 — Chi tiết yêu cầu + tiến trình duyệt; xác nhận đã nhận. */
export const RequestDetailScreen: React.FC<ScreenProps<typeof Routes.REQUEST_DETAIL>> = ({ route, navigation }) => {
  const s = useStyles();
  const c = useColors();
  const r = myRequests.find((x) => x.id === route.params.requestId) ?? myRequests[0];
  const toReceive = r.tone === 'warning';
  return (
    <ScrollPage
      title="Yêu cầu"
      caption={r.code}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          {toReceive ? (
            <Button
              title="Xác nhận đã nhận đủ"
              onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã nhận đủ · yêu cầu đã đóng', body: 'Người giao và bộ phận xử lý nhận thông báo.', kind: 'Hành chính, IT', code: r.code })}
            />
          ) : null}
          <Button title="Trao đổi" variant="secondary" onPress={() => navigation.navigate(Routes.COMMENTS, { code: r.code })} />
        </BottomBar>
      }
    >
      <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>{r.title}</AppText>
      <Tag label={r.sub} tone={r.tone} />
      <SectionHeader title="Tiến trình" />
      <Group>
        {requestSteps.map((st) => (
          <View key={st.name} style={s.step}>
            {st.done ? <CircleCheck size={20} color={c.success} /> : st.current ? <Clock size={20} color={c.progress} /> : <Circle size={20} color={c.muted} />}
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{st.name}</AppText>
              <AppText variant="caption" tone="muted">{st.who}</AppText>
            </View>
          </View>
        ))}
      </Group>
    </ScrollPage>
  );
};

/** G07 — Cần tôi duyệt. */
export const ApprovalsScreen: React.FC<ScreenProps<typeof Routes.APPROVALS>> = ({ navigation }) => {
  const [f, setF] = useState('Chờ tôi 3');
  return (
    <ScrollPage title="Duyệt" caption="Phòng Kế hoạch" onBack={navigation.goBack}>
      <Chips items={['Chờ tôi 3', 'Đã duyệt', 'Đã từ chối']} value={f} onChange={setF} />
      {f.startsWith('Chờ') ? (
        <Group>
          {approvals.map((a) => (
            <Row key={a.id} title={a.title} subtitle={`${a.who} · ${a.amount} · ${a.due}`} subtitleTone={a.tone} onPress={() => navigation.navigate(Routes.APPROVAL_DECISION, { approvalId: a.id })} />
          ))}
        </Group>
      ) : (
        <AppText variant="caption" tone="muted">Chưa có phiếu trong 7 ngày gần đây.</AppText>
      )}
      <AppText variant="caption" tone="muted">Chỉ hiện phiếu bạn là người duyệt của bước hiện tại.</AppText>
    </ScrollPage>
  );
};

/** G08 — Quyết định phê duyệt. */
export const ApprovalDecisionScreen: React.FC<ScreenProps<typeof Routes.APPROVAL_DECISION>> = ({ route, navigation }) => {
  const s = useStyles();
  const a = approvals.find((x) => x.id === route.params.approvalId) ?? approvals[0];
  return (
    <ScrollPage
      title="Phê duyệt"
      caption={`${a.code} · Bước 1/2`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Duyệt"
            onPress={() => navigation.replace(Routes.SUCCESS, { title: `Đã duyệt ${a.code}`, body: 'Chuyển sang bước tiếp theo. Người đề nghị đã được báo.', kind: 'Phê duyệt', code: a.code, primary: 'Phiếu tiếp theo' })}
          />
          <Button title="Từ chối" variant="secondary" onPress={() => navigation.navigate(Routes.REJECT_REASON, { approvalId: a.id })} />
        </BottomBar>
      }
    >
      <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>{a.title}</AppText>
      <AppText tone="muted">{a.who}</AppText>
      <View style={s.amount}>
        <AppText variant="title" style={{ fontSize: 32, lineHeight: 38 }}>{a.amount}</AppText>
        <AppText variant="caption" tone={a.tone}>{a.due}</AppText>
      </View>
      {a.id === 9 ? (
        <Group>
          {approvalLines.map((l) => (
            <KV key={l.label} label={l.label} value={l.value} />
          ))}
        </Group>
      ) : null}
      <AppText variant="caption" tone="muted">Cần kết nối mạng để ghi nhận quyết định.</AppText>
    </ScrollPage>
  );
};

/** G09 — Từ chối cần lý do (form sheet). */
export const RejectReasonSheet: React.FC<ScreenProps<typeof Routes.REJECT_REASON>> = ({ navigation }) => {
  const s = useStyles();
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const quick = ['Vượt ngân sách', 'Thiếu báo giá', 'Không cần thiết'];
  return (
    <View style={s.sheet}>
      <AppText variant="heading">Từ chối</AppText>
      <Field label="Lý do (người đề nghị sẽ thấy)" value={reason} onChangeText={setReason} invalid={tried && !reason.trim()} multiline />
      {tried && !reason.trim() ? <AppText variant="caption" tone="danger">Nhập lý do trước khi từ chối.</AppText> : null}
      <Chips items={quick} value="" onChange={setReason} />
      <Button
        title="Từ chối yêu cầu"
        variant="danger"
        onPress={() => {
          setTried(true);
          if (reason.trim()) navigation.popTo(Routes.APPROVALS);
        }}
      />
    </View>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    check: { gap: space.sm },
    pair: { flexDirection: 'row', gap: space.sm },
    answer: { flex: 1, height: 48, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
    step: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
    amount: { gap: 2, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    sheet: { flex: 1, gap: space.lg, padding: space.xl, backgroundColor: c.bg },
  })
);
