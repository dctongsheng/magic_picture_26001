import { AuthConfig, ValidateInviteResponse, AuthSession } from '../types';
import { storage } from '../utils/storage';

/**
 * 认证服务类
 */
export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * 验证邀请码
   */
  async validateInviteCode(code: string): Promise<ValidateInviteResponse> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          projectId: this.config.projectId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 保存会话
        const session: AuthSession = {
          token: data.token,
          expiresAt: data.expiresAt,
          inviteCode: code,
          projectId: this.config.projectId
        };
        storage.set(this.getStorageKey('session'), session);

        return { success: true, token: data.token, expiresAt: data.expiresAt };
      }

      return { success: false, error: data.error || 'Invalid invite code' };
    } catch (error) {
      console.error('Validate invite code error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  /**
   * 验证 token 有效性
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前会话
   */
  getSession(): AuthSession | null {
    return storage.get<AuthSession>(this.getStorageKey('session'));
  }

  /**
   * 清除会话
   */
  clearSession(): void {
    storage.remove(this.getStorageKey('session'));
  }

  /**
   * 生成 localStorage key
   */
  private getStorageKey(key: string): string {
    return `${this.config.storageKey || 'auth'}_${key}`;
  }
}
