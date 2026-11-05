import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import config from '../../core/config';
import { Approval, ApprovalDecisionParams } from '../../domain/entities/approval';
import { ApprovalRepositoryImpl } from '../../data/repositories/ApprovalRepositoryImpl';
import { useAuthStore } from './authStore';

const repo = new ApprovalRepositoryImpl();

export const useApprovals = () => {
  const userId = useAuthStore((s) => s.user?.id);
  const queryKey = ['pending-approvals', userId];
  const query = useQuery({
    queryKey,
    enabled: !config.demo && !!userId,
    queryFn: async () => (await repo.getPendingApprovals()).filter((a) => a.status === 'PENDING'),
    retry: false,
    networkMode: 'always',
    staleTime: 0,
  });
  return { ...query, queryKey };
};

export const useApprovalDecision = (approvalId: number) => {
  const query = useApprovals();
  const { queryKey } = query;
  const client = useQueryClient();
  const mutationKey = [...queryKey, approvalId, 'decision'];
  const busy = useIsMutating({ mutationKey }) > 0;
  const approval = query.data?.find((a) => a.id === approvalId && a.status === 'PENDING');
  const decision = useMutation({
    mutationKey,
    mutationFn: (params: ApprovalDecisionParams) => repo.makeDecision(params),
    // Không retry và không giữ quyết định offline để gửi lại khi có mạng.
    retry: false,
    networkMode: 'always',
    onMutate: () => client.cancelQueries({ queryKey }),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey });
      client.setQueryData<Approval[]>(queryKey, (data) => data?.filter((a) => a.id !== approvalId));
      void client.invalidateQueries({ queryKey });
    },
    onError: () => {
      // Bao gồm 409 và lỗi mất kết nối có kết quả chưa xác định; chỉ tải GET.
      void client.invalidateQueries({ queryKey });
    },
  });
  const canDecide = !config.demo && !!approval && !query.isError && !decision.isError;
  const submit = (status: ApprovalDecisionParams['status'], decisionNote?: string, onSuccess?: () => void) => {
    // Kiểm tra đồng bộ: chặn cả hai lần bấm trước khi React kịp vẽ lại.
    if (!canDecide || client.isMutating({ mutationKey }) > 0 || client.getQueryState(queryKey)?.status === 'error') return;
    if (!client.getQueryData<Approval[]>(queryKey)?.some((a) => a.id === approvalId && a.status === 'PENDING')) return;
    decision.mutate({ approvalId, status, decisionNote }, { onSuccess });
  };
  const refresh = async () => {
    const result = await query.refetch();
    if (!result.isError) decision.reset();
  };
  return { ...query, approval, decision, busy, canDecide, submit, refresh };
};
