import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Circle, CircleCheck, CircleCheckBig, Clock, ClipboardCheck, FileText, CircleX, Check, X, Search } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import {
  approvalLines, approvals, checklist, inspections, myRequests, requestForms, requestSteps, requestTypes,
} from '../../../data/demo/fixtures';
import {
  AppText, Avatar, Banner, BottomBar, Button, Chips, Fab, Field, Group, IconButton, KV, PressableScale, Row, Screen, ScreenHeader, ScrollPage, SectionHeader, Tag,
  TaskRow,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';
import { FigmaAnim } from '../../components/anim/FigmaAnim';
import { useAuthStore } from '../../state/authStore';
import { useRoleScope } from '../../state/useHomeRole';

/* ───────── F · Kiểm tra chất lượng ───────── */

/** F01 — Kiểm tra được giao. */
export const InspectionsScreen: React.FC<ScreenProps<typeof Routes.INSPECTIONS>> = ({ navigation }) => {
  const s = useStyles();
  const todo = inspections.filter((i) => !i.sent);
  const chips = [`Hôm nay ${inspections.length}`, `Chưa làm ${todo.length}`, `Đã gửi ${inspections.length - todo.length}`];
  const [f, setF] = useState(chips[0]);
  const list = f === chips[1] ? todo : f === chips[2] ? inspections.filter((i) => i.sent) : inspections;
  return (
    <ScrollPage
      title="Kiểm tra"
      caption="QA/QC · Ca sáng 30/10"
      onBack={navigation.goBack}
      right={<IconButton icon={Search} label="Tìm kiếm" onPress={() => navigation.navigate(Routes.SEARCH)} />}
    >
      <Chips items={chips} value={f} onChange={setF} />
      <Group>
        {list.map((i) => (
          <TaskRow
            key={i.id}
            title={i.title}
            status={i.status}
            meta={i.sub}
            due={i.due}
            dueTone={i.dueTone}
            onPress={() => (i.sent ? navigation.navigate(i.status === 'blocked' ? Routes.NCR_DETAIL : Routes.LOT_TRACE) : navigation.navigate(Routes.INSPECTION_RUNNER, { inspectionId: i.id }))}
          />
        ))}
      </Group>
      {!list.length ? <AppText variant="caption" tone="muted" style={s.small}>Không có kiểm tra nào trong mục này.</AppText> : null}
    </ScrollPage>
  );
};

type Answer = 'pass' | 'fail' | 'na';
const ANSWERS: [Answer, string][] = [['pass', 'Đạt'], ['fail', 'Không đạt'], ['na', 'N/A']];

/** F02 / F03 — Thực hiện checklist: Đạt / Không đạt / N/A; gửi khi thiếu mục thì hiện danh sách mục còn thiếu. */
export const InspectionRunnerScreen: React.FC<ScreenProps<typeof Routes.INSPECTION_RUNNER>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [ans, setAns] = useState<Record<number, Answer>>({});
  const [review, setReview] = useState(false);
  const done = Object.keys(ans).length;
  const missing = checklist.map((q, i) => ({ ...q, i })).filter((q) => !ans[q.i]);
  const submit = () => {
    if (missing.length) return setReview(true);
    const counted = Object.values(ans).filter((a) => a !== 'na');
    navigation.navigate(Routes.INSPECTION_SUBMIT, { passed: counted.filter((a) => a === 'pass').length, total: counted.length });
  };

  if (review && missing.length) {
    // F03 — còn mục chưa chọn kết quả
    return (
      <ScrollPage
        title="Kiểm tra"
        caption="Khu vực đóng gói · A2"
        onBack={() => setReview(false)}
        footer={
          <BottomBar>
            <Button title="Đi tới mục còn thiếu" onPress={() => setReview(false)} />
            <Button title="Lưu nháp" variant="secondary" onPress={navigation.goBack} />
          </BottomBar>
        }
      >
        <Banner tone="warning" text={`Còn ${missing.length} mục chưa chọn kết quả. Không thể gửi khi checklist chưa đủ.`} />
        <Group>
          <Row icon={CircleCheckBig} iconTone="success" title={`${done} mục đã kiểm`} chevron={false} />
          {missing.map((q) => (
            <Row key={q.title} icon={Circle} iconTone="warning" title={q.title} subtitle="Chưa chọn" subtitleTone="warning" onPress={() => setReview(false)} />
          ))}
        </Group>
      </ScrollPage>
    );
  }

  const pct = Math.round((done / checklist.length) * 100);
  return (
    <ScrollPage
      title="Kiểm tra"
      caption="Khu vực đóng gói · A2"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title={missing.length ? `Tiếp: ${done + 1}/${checklist.length}` : 'Gửi kết quả'} onPress={submit} />
        </BottomBar>
      }
    >
      <View style={s.progress}>
        <View style={s.between}>
          <AppText variant="caption" tone="muted">{`${done}/${checklist.length} tiêu chí`}</AppText>
          <AppText variant="label">{`${pct}%`}</AppText>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${pct}%` }]} />
        </View>
      </View>
      <Group>
        {checklist.map((q, i) => (
          <View key={q.title} style={s.check}>
            <AppText variant="bodyMedium">{q.title}</AppText>
            <View style={s.pair}>
              {ANSWERS.map(([v, label]) => {
                const on = ans[i] === v;
                const tone = v === 'pass' ? 'success' : v === 'fail' ? 'danger' : 'ink';
                return (
                  <PressableScale
                    key={v}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setAns((a) => ({ ...a, [i]: v }))}
                    style={[s.answer, on && v !== 'na' && { backgroundColor: c[v === 'pass' ? 'successSoft' : 'dangerSoft'], borderColor: c[tone] }, on && v === 'na' && { borderColor: c.ink }]}
                  >
                    {on && v === 'pass' ? <Check size={16} color={c.success} /> : on && v === 'fail' ? <X size={16} color={c.danger} /> : null}
                    <AppText variant="label" tone={on ? tone : 'muted'} style={s.answerText}>
                      {label}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
            {ans[i] === 'fail' && q.fail ? <AppText variant="caption" tone="danger">{q.fail}</AppText> : null}
          </View>
        ))}
      </Group>
    </ScrollPage>
  );
};

/** F05 — Kết quả kiểm tra (đã khoá): cảnh cổng QC, kết quả, việc khắc phục và ghi nhận. */
export const InspectionResultScreen: React.FC<ScreenProps<typeof Routes.INSPECTION_RESULT>> = ({ route, navigation }) => {
  const s = useStyles();
  const c = useColors();
  const { passed, total } = route.params;
  const ok = passed === total;
  const at = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const log: [string, string][] = ok ? [['Trần Thị Ngọc gửi kết quả', at]] : [['Trần Thị Ngọc gửi kết quả', at], ['Flowse tạo việc khắc phục', at]];
  return (
    <ScrollPage
      title="Kết quả"
      caption={`QC-2610-018 · đã khóa ${at}`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          {!ok && <Button title="Ghi nhận không phù hợp (NCR)" variant="danger" onPress={() => navigation.replace(Routes.NCR_NEW)} />}
          <Button title="Về trang chủ" variant={ok ? 'primary' : 'secondary'} onPress={() => navigation.popToTop()} />
        </BottomBar>
      }
    >
      <FigmaAnim kind="scan" />
      <View style={[s.verdict, { backgroundColor: c[ok ? 'successSoft' : 'dangerSoft'] }]}>
        <AppText variant="title" tone={ok ? 'success' : 'danger'} style={s.verdictTitle}>{ok ? 'Đạt' : 'Chưa đạt'}</AppText>
        <AppText tone={ok ? 'success' : 'danger'} style={s.verdictSub}>{`${passed}/${total} tiêu chí đạt`}</AppText>
      </View>
      {!ok ? (
        <>
          <SectionHeader title="Việc liên quan" count={1} />
          <Group>
            <TaskRow title="Thay bình chữa cháy số 3" status="todo" meta="Tổ an toàn" due="31/10" />
          </Group>
        </>
      ) : null}
      <SectionHeader title="Ghi nhận" />
      <View>
        {log.map(([t, time], i) => (
          <View key={t} style={s.event}>
            <View style={s.rail}>
              <View style={[s.dot, { backgroundColor: i === 0 ? c[ok ? 'success' : 'danger'] : c.line }]} />
              {i < log.length - 1 ? <View style={s.railLine} /> : null}
            </View>
            <View style={s.eventText}>
              <AppText style={s.eventBody}>{t}</AppText>
              <AppText variant="caption" tone="muted" style={s.small}>{time}</AppText>
            </View>
          </View>
        ))}
      </View>
    </ScrollPage>
  );
};

/* ───────── G · Yêu cầu & phê duyệt ───────── */

/** G01 — Yêu cầu của tôi (tab văn phòng). */
export const RequestsScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const back = myRequests.filter((r) => r.tone === 'danger');
  const chips = [`Đang mở ${myRequests.length - back.length}`, `Cần bổ sung ${back.length}`, 'Đã xong'];
  const [f, setF] = useState(chips[0]);
  const list = f === chips[1] ? back : f === chips[2] ? [] : myRequests;
  return (
    <Screen>
      <ScreenHeader title="Yêu cầu" caption="Phòng Kế hoạch" />
      <ScrollView contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.xl, paddingBottom: 100 }}>
        <Chips items={chips} value={f} onChange={setF} />
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
export const RequestTypesScreen: React.FC<ScreenProps<typeof Routes.REQUEST_TYPES>> = ({ navigation }) => {
  const [q, setQ] = useState('');
  const list = requestTypes.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <ScrollPage title="Chọn loại yêu cầu" caption="Yêu cầu mới" onBack={navigation.goBack}>
      <Field label="Tìm loại yêu cầu" icon={Search} value={q} onChangeText={setQ} placeholder="Ví dụ: nghỉ phép" />
      <Group>
        {list.map((t) => (
          <Row
            key={t.key}
            icon={FileText}
            title={t.name}
            titleTone={t.soon ? 'muted' : 'ink'}
            subtitle={t.sub}
            onPress={t.soon ? undefined : () => navigation.navigate(Routes.REQUEST_FORM, { typeKey: t.key })}
          />
        ))}
      </Group>
    </ScrollPage>
  );
};

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
              onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã nhận đủ · yêu cầu đã đóng', body: 'Người giao và bộ phận xử lý nhận thông báo.', kind: 'Hành chính, IT', code: r.code, rows: [['Thiết bị', 'Dell Latitude 5440'], ['Mã tài sản', 'IT-LT-0412'], ['Người giao', 'Phan Minh Trí · 09:30']] })}
            />
          ) : null}
          {r.tone === 'danger' ? <Button title="Bổ sung và gửi lại" onPress={() => navigation.navigate(Routes.REQUEST_EDIT, { requestId: r.id })} /> : null}
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
  const chips = [`Chờ tôi ${approvals.length}`, 'Đã duyệt', 'Đã từ chối'];
  const [f, setF] = useState(chips[0]);
  const user = useAuthStore((st) => st.user);
  const scope = useRoleScope();
  return (
    <ScrollPage
      title="Duyệt"
      caption={scope.unit}
      onBack={navigation.goBack}
      right={<IconButton icon={Search} label="Tìm phiếu" onPress={() => navigation.navigate(Routes.SEARCH)} />}
    >
      <Chips items={chips} value={f} onChange={setF} />
      {f === chips[0] ? (
        <Group>
          {approvals.map((a) => (
            <Row key={a.id} leading={<Avatar name={a.who} size={28} />} title={a.title} subtitle={`${a.who} · ${a.amount} · ${a.due}`} subtitleTone={a.tone} onPress={() => (a.who === user?.name ? navigation.navigate(Routes.STATE, { k: 'K12' }) : navigation.navigate(Routes.APPROVAL_DECISION, { approvalId: a.id }))} />
          ))}
        </Group>
      ) : (
        <AppText variant="caption" tone="muted">Chưa có phiếu trong 7 ngày gần đây.</AppText>
      )}
      <AppText variant="caption" tone="muted">Chỉ hiện phiếu bạn là người duyệt của bước hiện tại.</AppText>
      <Group>
        <Row title="Ủy quyền duyệt" subtitle="Khi vắng mặt" onPress={() => navigation.navigate(Routes.DELEGATION)} />
      </Group>
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
            onPress={() => navigation.replace(Routes.SUCCESS, { title: `Đã duyệt ${a.code}`, body: `Chuyển sang bước tiếp theo. ${a.who ?? 'Người đề nghị'} đã được báo.`, kind: 'Phê duyệt', code: a.code, primary: `Phiếu tiếp theo (${approvals.length - 1})`, anim: 'stamp' })}
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
    check: { gap: space.md, paddingVertical: space.lg, paddingHorizontal: space.lg },
    pair: { flexDirection: 'row', gap: space.sm },
    answer: { flex: 1, height: 42, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
    answerText: { fontSize: 14 },
    small: { fontSize: 12 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progress: { gap: space.sm },
    track: { height: 6, borderRadius: 3, backgroundColor: c.subtle, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
    verdict: { gap: 2, padding: space.lg, borderRadius: radius.xl },
    verdictTitle: { fontSize: 24, lineHeight: 30 },
    verdictSub: { fontSize: 14 },
    event: { flexDirection: 'row', gap: space.md },
    rail: { width: 10, alignItems: 'center', paddingTop: 5 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    railLine: { flex: 1, width: 2, marginTop: 4, backgroundColor: c.line },
    eventText: { flex: 1, gap: 2, paddingBottom: space.lg },
    eventBody: { fontSize: 14, lineHeight: 20 },
    step: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
    amount: { gap: 2, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    sheet: { flex: 1, gap: space.lg, padding: space.xl, backgroundColor: c.bg },
  })
);
