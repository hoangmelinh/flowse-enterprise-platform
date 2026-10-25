import { create } from 'zustand';
import { User, Workspace, UserCapabilities } from '../../domain/entities/auth';
import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';

const authRepo = new AuthRepositoryImpl();

interface AuthState {
  user: User | null;
  token: string | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  capabilities: UserCapabilities;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchWorkspace: (workspace: Workspace) => Promise<void>;
}

const computeCapabilities = (role: string): UserCapabilities => {
  const r = role.toLowerCase();
  const isAdmin = r === 'admin';
  const isManager = r === 'manager' || isAdmin;
  const isTech = r === 'technician' || isAdmin;
  const isQA = r === 'qa' || isAdmin;

  return {
    canScanQR: true,
    canReportIncident: true,
    canTriageIncident: isManager,
    canExecuteRepair: isTech,
    canVerifyIncident: isQA || isManager,
    canCloseIncident: isManager,
    canRunInspection: isQA || isTech || isManager,
    canApprove: isManager,
    canCreateTask: true,
    canAssignWork: isManager,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  currentWorkspace: null,
  workspaces: [],
  capabilities: computeCapabilities('member'),
  isLoading: true,
  error: null,

  login: async (usernameOrEmail, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authRepo.login(usernameOrEmail, password);
      const workspaces = await authRepo.getUserWorkspaces();
      const currentWorkspace = workspaces[0] || null;

      const effectiveRole = currentWorkspace?.role || user.role || 'member';
      const capabilities = computeCapabilities(effectiveRole);

      set({
        user,
        token,
        workspaces,
        currentWorkspace,
        capabilities,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({
        error: err.message || 'Đăng nhập không thành công',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await authRepo.logout();
    set({
      user: null,
      token: null,
      currentWorkspace: null,
      workspaces: [],
      capabilities: computeCapabilities('member'),
      isLoading: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await authRepo.getToken();
      if (!token) {
        set({ isLoading: false, user: null, token: null });
        return;
      }

      const user = await authRepo.getCurrentUser();
      if (!user) {
        set({ isLoading: false, user: null, token: null });
        return;
      }

      const workspaces = await authRepo.getUserWorkspaces();
      const currentWorkspace = workspaces[0] || null;
      const effectiveRole = currentWorkspace?.role || user.role || 'member';

      set({
        user,
        token,
        workspaces,
        currentWorkspace,
        capabilities: computeCapabilities(effectiveRole),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, user: null, token: null });
    }
  },

  switchWorkspace: async (workspace) => {
    await authRepo.switchWorkspace(workspace.id);
    const currentUser = get().user;
    const effectiveRole = workspace.role || currentUser?.role || 'member';
    set({
      currentWorkspace: workspace,
      capabilities: computeCapabilities(effectiveRole),
    });
  },
}));
