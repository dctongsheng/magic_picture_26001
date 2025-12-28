/**
 * 认证系统配置
 */
export interface AuthConfig {
  /** 认证 API 地址 */
  apiBaseUrl: string;
  /** 项目标识符 */
  projectId: string;
  /** localStorage key 前缀 */
  storageKey?: string;
  /** token 刷新间隔 (毫秒)，默认 5 分钟 */
  tokenRefreshInterval?: number;
}

/**
 * 用户会话信息
 */
export interface AuthSession {
  /** JWT token */
  token: string;
  /** 过期时间戳 */
  expiresAt: number;
  /** 使用的邀请码 */
  inviteCode: string;
  /** 项目 ID */
  projectId: string;
}

/**
 * 验证邀请码的响应
 */
export interface ValidateInviteResponse {
  /** 是否成功 */
  success: boolean;
  /** JWT token */
  token?: string;
  /** 过期时间 */
  expiresAt?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 认证上下文值
 */
export interface AuthContextValue {
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 当前会话 */
  session: AuthSession | null;
  /** 登录方法 */
  login: (inviteCode: string) => Promise<void>;
  /** 登出方法 */
  logout: () => void;
  /** 刷新会话 */
  refreshSession: () => Promise<void>;
}
