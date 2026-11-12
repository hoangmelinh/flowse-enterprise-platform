import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { User, UserCapabilities, UserContext, Workspace } from '../../domain/entities/auth';
import apiClient from '../api/apiClient';
import secureStorage from '../local/secureStorage';

// Tên quyền trên /users/contexts (backend tính theo vai trò và phòng ban) → tên trong app
const CAPABILITY_KEYS: [keyof UserCapabilities, string][] = [
  ['canScanQR', 'can_scan_qr'], ['canReportIncident', 'can_report_incident'], ['canTriageIncident', 'can_triage_incident'],
  ['canExecuteRepair', 'can_execute_repair'], ['canVerifyIncident', 'can_verify_incident'], ['canCloseIncident', 'can_close_incident'],
  ['canRunInspection', 'can_run_inspection'], ['canApprove', 'can_approve'], ['canCreateTask', 'can_create_task'], ['canAssignWork', 'can_assign_work'],
];
export const toCapabilities = (raw: Record<string, unknown> = {}): UserCapabilities =>
  Object.fromEntries(CAPABILITY_KEYS.map(([app, api]) => [app, raw[api] === true])) as unknown as UserCapabilities;

export class AuthRepositoryImpl implements IAuthRepository {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Backend: POST /auth/signin { email, password } -> { user: { ..., access_token } }
    const res = await apiClient.post('/auth/signin', { email, password });
    return this.saveSession(res.data.user);
  }

  /** Backend: POST /auth/google { idToken } → cùng dạng { user: { ..., access_token } } như đăng nhập thường */
  async loginWithGoogle(idToken: string): Promise<{ user: User; token: string }> {
    const res = await apiClient.post('/auth/google', { idToken });
    return this.saveSession(res.data.user);
  }

  private async saveSession(user: any): Promise<{ user: User; token: string }> {
    const token: string = user.access_token;

    await secureStorage.saveToken(token);

    const mappedUser: User = {
      id: user.user_id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      phoneNumber: user.phone_number,
      role: user.role || 'member',
      departmentId: user.department_id,
      departmentName: user.department_name,
    };

    return { user: mappedUser, token };
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/signout');
    } catch (e) {
      // Bỏ qua lỗi server nếu token đã hết hạn
    } finally {
      await secureStorage.removeToken();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const token = await secureStorage.getToken();
    if (!token) return null;

    try {
      const res = await apiClient.get('/users/profile');
      const u = res.data.user;
      return {
        id: u.user_id,
        username: u.username,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url,
        phoneNumber: u.phone_number,
        role: u.role || 'member',
        departmentId: u.department_id,
        departmentName: u.department_name,
      };
    } catch {
      return null;
    }
  }

  async getContexts(workspaceId?: number | null): Promise<UserContext> {
    const res = await apiClient.get('/users/contexts', { params: workspaceId ? { workspaceId } : undefined });
    const d = res.data?.data || {};
    const workspaces: Workspace[] = (d.workspaces || []).map((w: any) => ({
      id: w.workspace_id,
      name: w.name,
      slug: w.slug,
      description: w.description,
      role: w.role_name || 'member',
    }));
    return {
      workspaces,
      currentWorkspace: workspaces.find((w) => w.id === d.current_workspace_id) || null,
      capabilities: toCapabilities(d.capabilities),
    };
  }

  async switchWorkspace(workspaceId: number): Promise<void> {
    await secureStorage.saveCurrentWorkspaceId(workspaceId);
  }

  async getToken(): Promise<string | null> {
    return secureStorage.getToken();
  }
}
