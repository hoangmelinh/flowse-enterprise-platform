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
