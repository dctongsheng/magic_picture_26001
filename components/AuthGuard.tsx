import React from 'react';
import { useAuth, InviteLogin } from '../lib/auth';
import { Camera } from 'lucide-react';

/**
 * 项目特定的认证守卫组件
 *
 * 当用户未登录时，显示邀请码登录界面
 * 当用户已登录时，显示子组件
 */
export const AuthGuard: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
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
    return (
      <InviteLogin
        title="Magic Picture Studio"
        description="Enter your invite code to access the AI food photography tool"
        logo={<Camera size={32} className="text-indigo-600" />}
        customTheme={{
          primaryColor: '#4F46E5',
          backgroundColor: '#F9FAFB'
        }}
      />
    );
  }

  return <>{children}</>;
};
