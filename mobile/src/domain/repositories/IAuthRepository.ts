import { User, UserContext } from '../entities/auth';

export interface IAuthRepository {
  login(usernameOrEmail: string, password: string): Promise<{ user: User; token: string }>;
  loginWithGoogle(idToken: string): Promise<{ user: User; token: string }>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  /** Nơi làm việc của user và quyền tính theo `workspaceId` (không có / không còn thì backend lấy nơi đầu tiên). */
  getContexts(workspaceId?: number | null): Promise<UserContext>;
  switchWorkspace(workspaceId: number): Promise<void>;
  getToken(): Promise<string | null>;
}
