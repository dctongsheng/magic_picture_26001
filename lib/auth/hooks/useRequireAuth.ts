import { useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';

/**
 * 强制要求认证的 Hook
 *
 * 用于保护需要登录的页面或组件。如果用户未登录，可以执行自定义操作。
 *
 * @param onUnauth - 未登录时的回调函数（可选）
 *
 * @example
 * ```tsx
 * const { isAuthenticated, isLoading } = useRequireAuth(() => {
 *   // 未登录时的处理
 *   toast.error('Please login first');
 * });
 *
 * if (isLoading) return <Loading />;
 * if (!isAuthenticated) return null;
 * ```
 */
export const useRequireAuth = (onUnauth?: () => void) => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (onUnauth) {
        onUnauth();
      } else {
        // 默认行为：刷新页面会触发登录流程
        window.location.reload();
      }
    }
  }, [isAuthenticated, isLoading, onUnauth]);

  return { isAuthenticated, isLoading };
};
