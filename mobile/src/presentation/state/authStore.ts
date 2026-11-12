import { create } from 'zustand';
import { User, Workspace, UserCapabilities } from '../../domain/entities/auth';
import { AuthRepositoryImpl, toCapabilities } from '../../data/repositories/AuthRepositoryImpl';
import secureStorage from '../../data/local/secureStorage';
import { usePrefs } from './prefsStore';

const authRepo = new AuthRepositoryImpl();

interface AuthState {
  user: User | null;
  token: string | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  capabilities: UserCapabilities;
  isLoading: boolean;
  // true sau lần kiểm tra phiên đầu tiên lúc mở app
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  switchWorkspace: (workspace: Workspace) => Promise<void>;
}

// Chưa đăng nhập: không có quyền nào
const NO_CAPABILITIES = toCapabilities();

/**
 * Nơi làm việc và quyền do backend tính (/users/contexts): theo vai trò trong nơi đó và phòng ban, không đoán từ tên vai trò.
 * Mở lại app thì về nơi đã chọn lần trước; nơi đó không còn thì backend trả nơi đầu tiên.
 */
async function loadContext(workspaceId?: number | null) {
  const ctx = await authRepo.getContexts(workspaceId ?? (await secureStorage.getCurrentWorkspaceId()));
  if (ctx.currentWorkspace) await authRepo.switchWorkspace(ctx.currentWorkspace.id);
  return ctx;
}

/** Đăng nhập chung cho mật khẩu và Google: lưu phiên, tải nơi làm việc, tính quyền. */
async function signIn(set: (p: Partial<AuthState>) => void, call: () => Promise<{ user: User; token: string }>): Promise<boolean> {
  set({ isLoading: true, error: null });
  try {
    const { user, token } = await call();
    const { workspaces, currentWorkspace, capabilities } = await loadContext();

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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  currentWorkspace: null,
  workspaces: [],
  capabilities: NO_CAPABILITIES,
  isLoading: true,
  isInitialized: false,
  error: null,

  login: (usernameOrEmail, password) => signIn(set, () => authRepo.login(usernameOrEmail, password)),
  loginWithGoogle: (idToken) => signIn(set, () => authRepo.loginWithGoogle(idToken)),

  logout: async () => {
    set({ isLoading: true });
    await authRepo.logout();
    // Vai trò xem thử ở Tôi là của người vừa đăng xuất, không để sang người đăng nhập sau trên cùng máy
    usePrefs.getState().set({ homeRole: null });
    set({
      user: null,
      token: null,
      currentWorkspace: null,
      workspaces: [],
      capabilities: NO_CAPABILITIES,
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

      const { workspaces, currentWorkspace, capabilities } = await loadContext();

      set({
        user,
        token,
        workspaces,
        currentWorkspace,
        capabilities,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, user: null, token: null });
    } finally {
      set({ isInitialized: true });
    }
  },

  switchWorkspace: async (workspace) => {
    const { workspaces, currentWorkspace, capabilities } = await loadContext(workspace.id);
    set({ workspaces, currentWorkspace, capabilities });
  },
}));
