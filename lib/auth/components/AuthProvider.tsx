import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/authService';
import { AuthConfig, AuthContextValue, AuthSession } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider 属性
 */
export interface AuthProviderProps {
  /** 认证配置 */
  config: AuthConfig;
  /** 子组件 */
  children: React.ReactNode;
}

/**
 * 认证提供者组件
 *
 * @example
 * ```tsx
 * <AuthProvider config={{ apiBaseUrl: '...', projectId: '...' }}>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ config, children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authService = new AuthService(config);

  // 初始化：检查现有会话
  useEffect(() => {
    const checkSession = async () => {
      const savedSession = authService.getSession();
      if (savedSession) {
        const isValid = await authService.verifyToken(savedSession.token);
        if (isValid) {
          setSession(savedSession);
        } else {
          authService.clearSession();
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  // 自动刷新 token
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(async () => {
      const savedSession = authService.getSession();
      if (savedSession) {
        const isValid = await authService.verifyToken(savedSession.token);
        if (!isValid) {
          authService.clearSession();
          setSession(null);
        }
      }
    }, config.tokenRefreshInterval || 5 * 60 * 1000); // 默认 5 分钟

    return () => clearInterval(interval);
  }, [session, config]);

  const login = useCallback(async (inviteCode: string) => {
    const result = await authService.validateInviteCode(inviteCode);
    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }
    const newSession = authService.getSession();
    setSession(newSession!);
  }, [authService]);

  const logout = useCallback(() => {
    authService.clearSession();
    setSession(null);
  }, [authService]);

  const refreshSession = useCallback(async () => {
    const savedSession = authService.getSession();
    if (savedSession) {
      const isValid = await authService.verifyToken(savedSession.token);
      if (isValid) {
        setSession(savedSession);
      } else {
        logout();
      }
    }
  }, [authService, logout]);

  const value: AuthContextValue = {
    isAuthenticated: !!session,
    isLoading,
    session,
    login,
    logout,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 使用认证上下文的 Hook
 *
 * @example
 * ```tsx
 * const { isAuthenticated, login, logout } = useAuth();
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
