import { IAuthRepository } from '../../domain/repositories/IAuthRepository';
import { User, Workspace } from '../../domain/entities/auth';
import apiClient from '../api/apiClient';
import secureStorage from '../local/secureStorage';

export class AuthRepositoryImpl implements IAuthRepository {
  async login(usernameOrEmail: string, password: string): Promise<{ user: User; token: string }> {
    const isEmail = usernameOrEmail.includes('@');
    const payload = isEmail
      ? { email: usernameOrEmail, password }
      : { username: usernameOrEmail, password };

    const res = await apiClient.post('/auth/login', payload);
    const { token, user } = res.data;

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
      await apiClient.post('/auth/logout');
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
      const u = res.data;
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

  async getUserWorkspaces(): Promise<Workspace[]> {
    const res = await apiClient.get('/workspaces');
    return (res.data || []).map((w: any) => ({
      id: w.workspace_id,
      name: w.name,
      slug: w.slug,
      description: w.description,
      role: w.role_name || 'member',
    }));
  }

  async switchWorkspace(workspaceId: number): Promise<void> {
    await secureStorage.saveCurrentWorkspaceId(workspaceId);
  }

  async getToken(): Promise<string | null> {
    return secureStorage.getToken();
  }
}
