import { AxiosAdapter, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Chế độ xem thử (EXPO_PUBLIC_DEMO=1): trả lời API bằng dữ liệu mẫu ngay trên máy, không cần backend.
 * Định dạng giống hệt backend thật để repository không phải biết đang chạy demo.
 */
const daysFromNow = (d: number, hour = 17) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(hour, 0, 0, 0);
  return t.toISOString();
};

const user = {
  user_id: 1,
  username: 'minhanh',
  name: 'Nguyễn Minh Anh',
  email: 'minhanh@anphat.vn',
  role: 'manager',
};

const task = (id: number, name: string, due: number | null, status = 'Đang làm') => ({
  task_id: id,
  name,
  due_date: due === null ? null : daysFromNow(due),
  status_id: 1,
  status_name: status,
  list_id: 1,
  work_item_type: 'TASK',
  priority: 'Normal',
  version: 1,
});

const myTasks = [
  task(101, 'Bổ sung biên bản nghiệm thu AP-1126', -1),
  task(102, 'Chốt kế hoạch vật tư tháng 11', 0),
  task(103, 'Rà soát hồ sơ nghiệm thu AP-1126', 0),
  task(104, 'Báo cáo tiến độ đơn PO-2410', 2),
  task(105, 'Kiểm tra cảm biến băng tải A2', null, 'Chờ review'),
];
const transitions = [
  { transition_id: 1, transition_name: 'Hoàn thành', to_state_id: 3, to_state_name: 'Hoàn thành' },
  { transition_id: 2, transition_name: 'Gửi review', to_state_id: 2, to_state_name: 'Chờ review' },
];

// Tuyến có tham số: [method, regex, handler]
const patterns: [string, RegExp, (m: RegExpMatchArray, body: any) => unknown][] = [
  ['GET', /^\/tasks\/(\d+)$/, (m) => ({ task: myTasks.find((t) => t.task_id === +m[1]) ?? myTasks[0] })],
  ['GET', /^\/workflows\/tasks\/(\d+)\/transitions$/, () => transitions],
  [
    'POST',
    /^\/workflows\/tasks\/(\d+)\/transition$/,
    (m, body) => {
      const t = myTasks.find((x) => x.task_id === +m[1]) ?? myTasks[0];
      t.status_name = transitions.find((x) => x.to_state_id === body?.to_state_id)?.to_state_name ?? t.status_name;
      return { task: t };
    },
  ],
];

const routes: Partial<Record<string, () => unknown>> = {
  'POST /auth/signin': () => ({ message: 'Dang nhap thanh cong', user: { ...user, access_token: 'demo-token' } }),
  'POST /auth/signout': () => ({ message: 'ok' }),
  'GET /users/profile': () => ({ success: true, user }),
  'GET /workspaces': () => [{ workspace_id: 1, name: 'Nhà máy Bình Dương', slug: 'binh-duong', role_name: 'manager' }],
  'GET /tasks/my-tasks': () => [{ id: 1, name: 'Đang làm', tasks: myTasks }],
};

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await new Promise((r) => setTimeout(r, 400)); // giả lập độ trễ mạng để thấy trạng thái đang tải
  const path = (config.url || '').split('?')[0];
  const method = (config.method || 'get').toUpperCase();
  const key = `${method} ${path}`;
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  const hit = patterns.find(([m, re]) => m === method && re.test(path));
  const handler = routes[key] ?? (hit ? () => hit[2](path.match(hit[1])!, body) : undefined);
  const response: AxiosResponse = {
    data: handler ? handler() : { message: `Chế độ xem thử chưa có dữ liệu cho ${key}` },
    status: handler ? 200 : 404,
    statusText: handler ? 'OK' : 'Not Found',
    headers: {},
    config,
  };
  if (!handler) throw new AxiosError(response.data.message, 'ERR_BAD_REQUEST', config, null, response);
  return response;
};
