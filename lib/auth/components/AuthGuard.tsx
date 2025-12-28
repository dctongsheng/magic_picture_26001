import React from 'react';
import { useAuth } from './AuthProvider';

/**
 * AuthGuard 属性
 */
export interface AuthGuardProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 自定义未登录界面 */
  fallback?: React.ReactNode;
}

/**
 * 认证守卫组件
 *
 * 当用户未登录时，显示 fallback 或不显示任何内容
 * 当用户已登录时，显示 children
 *
 * @example
 * ```tsx
 * <AuthGuard fallback={<Login />}>
 *   <ProtectedComponent />
 * </AuthGuard>
 * ```
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
