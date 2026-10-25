import { User, Workspace } from '../entities/auth';

export interface IAuthRepository {
  login(usernameOrEmail: string, password: string): Promise<{ user: User; token: string }>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getUserWorkspaces(): Promise<Workspace[]>;
  switchWorkspace(workspaceId: number): Promise<void>;
  getToken(): Promise<string | null>;
}
