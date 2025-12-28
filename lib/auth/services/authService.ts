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
      // 构建 API URL（如果 apiBaseUrl 为空，使用相对路径通过代理）
      const apiUrl = this.config.apiBaseUrl 
        ? `${this.config.apiBaseUrl}/api/auth/validate`
        : '/api/auth/validate';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          projectId: this.config.projectId
        }),
        mode: 'cors'
      });

      // 检查响应状态
      if (!response.ok) {
        // 尝试解析错误响应
        try {
          const errorData = await response.json();
          return { success: false, error: errorData.error || `Server error: ${response.status}` };
        } catch {
          return { success: false, error: `Server error: ${response.status} ${response.statusText}` };
        }
      }

      const data = await response.json();

      if (data.success) {
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
    } catch (error: any) {
      console.error('Validate invite code error:', error);
      
      // 检查是否是 CORS 错误
      if (error.message && (error.message.includes('CORS') || error.message.includes('Failed to fetch'))) {
        return { 
          success: false, 
          error: 'CORS error: API server may not be configured correctly or is not accessible. Please check your API URL configuration.' 
        };
      }
      
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  }

  /**
   * 验证 token 有效性
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      // 构建 API URL（如果 apiBaseUrl 为空，使用相对路径通过代理）
      const apiUrl = this.config.apiBaseUrl 
        ? `${this.config.apiBaseUrl}/api/auth/verify`
        : '/api/auth/verify';

      const response = await fetch(apiUrl, {
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
