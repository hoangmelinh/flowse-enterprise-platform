export type DueBucket = 'overdue' | 'today' | 'later' | 'none';

/** Xếp hạn của việc theo ngày trên máy người dùng: quá hạn (trước hôm nay), hôm nay, sau này. */
export const dueBucket = (due?: string, now: Date = new Date()): DueBucket => {
  if (!due) return 'none';
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return 'none';
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (d < startToday) return 'overdue';
  if (d < startTomorrow) return 'today';
  return 'later';
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Chữ hạn trong dòng việc (Figma D01): quá hạn "Hôm qua" / "Quá N ngày", hôm nay giờ "16:30", sau đó "31/10". */
export const dueText = (due?: string, now: Date = new Date()): string | undefined => {
  const b = dueBucket(due, now);
  if (b === 'none') return undefined;
  const d = new Date(due!);
  if (b === 'today') return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (b === 'later') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  const days = overdueDays(due, now);
  return days === 1 ? 'Hôm qua' : `Quá ${days} ngày`;
};

/** Số ngày đã quá hạn (0 nếu chưa quá hạn hoặc không có hạn). */
export const overdueDays = (due?: string, now: Date = new Date()): number => {
  if (dueBucket(due, now) !== 'overdue') return 0;
  const d = new Date(due!);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startToday.getTime() - startDue.getTime()) / 86400000);
};

/** "29/10 · 17:00" (Hạn trong C06). */
export const fmtDue = (due: string): string => {
  const d = new Date(due);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
