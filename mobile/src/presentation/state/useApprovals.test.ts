import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { QueryClient, QueryObserver, MutationObserver, onlineManager } from '@tanstack/react-query';
import { loadModule } from '../../../test/loadModule.cjs';

const config = { demo: false };
let userId: number | undefined = 1;
let client: QueryClient;
let queryOptions: any;
let mutationOptions: any;
let mutationPromise: Promise<any>;
let failure: Error | undefined;
let finish: (() => void) | undefined;
let hold = false;
let calls: any[] = [];
let gets = 0;
const row = { id: 17, taskId: 42, status: 'PENDING', taskTitle: 'Xin linh kiện' };
const { useApprovals, useApprovalDecision } = loadModule(fileURLToPath(new URL('./useApprovals.ts', import.meta.url)), {
  '../../core/config': { __esModule: true, default: config },
  './authStore': { useAuthStore: (select: any) => select({ user: userId ? { id: userId } : null }) },
  '../../data/repositories/ApprovalRepositoryImpl': { ApprovalRepositoryImpl: class {
    async getPendingApprovals() { gets++; return [row]; }
    async makeDecision(params: any) {
      calls.push(params);
      if (hold) await new Promise<void>((resolve) => { finish = resolve; });
      if (failure) throw failure;
      return { ...row, status: params.status };
    }
  } },
  '@tanstack/react-query': {
    useQueryClient: () => client,
    useQuery: (options: any) => {
      queryOptions = options;
      return { data: client.getQueryData(options.queryKey), isError: false,
        refetch: async () => ({ data: await client.fetchQuery(options), isError: false }) };
    },
    useIsMutating: (filter: any) => client.isMutating(filter),
    useMutation: (options: any) => {
      mutationOptions = options;
      const observer = new MutationObserver(client, options);
      observer.subscribe(() => {});
      return { ...observer.getCurrentResult(), mutate: (params: any, callbacks: any) => {
        mutationPromise = observer.mutate(params, callbacks);
        void mutationPromise.catch(() => {});
      } };
    },
  },
});

test.beforeEach(() => {
  config.demo = false; userId = 1; failure = undefined; hold = false; finish = undefined; calls = []; gets = 0;
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false }, mutations: { retry: 3 } } });
  useApprovals();
  client.setQueryData(queryOptions.queryKey, [row]);
});
test.afterEach(() => { onlineManager.setOnline(true); client.clear(); });

test('query bị tắt ở demo/chưa đăng nhập và tách cache tài khoản', () => {
  const first = queryOptions.queryKey;
  config.demo = true; useApprovals(); assert.equal(queryOptions.enabled, false);
  config.demo = false; userId = undefined; useApprovals(); assert.equal(queryOptions.enabled, false);
  userId = 2; useApprovals(); assert.equal(queryOptions.enabled, true); assert.notDeepEqual(queryOptions.queryKey, first);
});

test('chỉ phiếu PENDING do backend trả mới có hành động; không lấy phiếu mẫu thay thế', () => {
  assert.equal(useApprovalDecision(17).canDecide, true);
  assert.equal(useApprovalDecision(999).canDecide, false);
  client.setQueryData(queryOptions.queryKey, [{ ...row, status: 'APPROVED' }]);
  const decision = useApprovalDecision(17);
  assert.equal(decision.canDecide, false);
  decision.submit('APPROVED');
  assert.deepEqual(calls, []);
});

test('hai lần bấm sát nhau chỉ gửi một POST, thành công loại phiếu và giảm badge', async () => {
  const decision = useApprovalDecision(17);
  decision.submit('APPROVED');
  decision.submit('APPROVED');
  await mutationPromise;
  assert.equal(calls.length, 1);
  assert.deepEqual(client.getQueryData(queryOptions.queryKey), []);
});

for (const statusCode of [403, 409, 500]) {
  test(`lỗi ${statusCode} giữ lỗi và tải lại GET, không tự gửi lại quyết định`, async () => {
    const observer = new QueryObserver(client, { ...queryOptions, staleTime: Infinity });
    const unsubscribe = observer.subscribe(() => {});
    failure = Object.assign(new Error('Không thể xử lý phiếu'), { statusCode });
    useApprovalDecision(17).submit('APPROVED');
    await assert.rejects(mutationPromise, (error) => error === failure);
    assert.equal(calls.length, 1);
    assert.equal(mutationOptions.retry, false);
    assert.ok(gets > 0);
    assert.deepEqual(client.getQueryData(queryOptions.queryKey), [row]);
    unsubscribe(); observer.destroy();
  });
}

test('mất mạng không xếp quyết định vào hàng đợi để tự gửi sau', async () => {
  onlineManager.setOnline(false);
  failure = new Error('Mất mạng');
  useApprovalDecision(17).submit('REJECTED', 'Không phù hợp');
  assert.equal(mutationOptions.networkMode, 'always');
  await assert.rejects(mutationPromise, /Mất mạng/);
  onlineManager.setOnline(true);
  assert.equal(calls.length, 1);
});

test('kết quả tải cũ không đưa phiếu đã duyệt trở lại danh sách', async () => {
  hold = true;
  useApprovalDecision(17).submit('APPROVED');
  await new Promise((resolve) => setImmediate(resolve));
  let finishRead: (rows: any[]) => void;
  const oldRead = client.fetchQuery({ ...queryOptions, queryFn: () => new Promise((resolve) => { finishRead = resolve; }) }).catch(() => {});
  finish!();
  await mutationPromise;
  finishRead!([row]);
  await oldRead;
  assert.deepEqual(client.getQueryData(queryOptions.queryKey), []);
});
