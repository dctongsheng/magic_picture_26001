import React from 'react';
import { AuthProvider } from './lib/auth';
import { AuthGuard } from './components/AuthGuard';
import { BillingGuard } from './components/BillingGuard';
import { Editor } from './components/Editor';

// 开发模式下可以禁用认证（设置为 false）
const DISABLE_AUTH_IN_DEV = import.meta.env.VITE_DISABLE_AUTH === 'true';

// 开发环境使用代理，生产环境使用相对路径（通过 Vercel rewrites）
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_AUTH_API_URL) {
    return import.meta.env.VITE_AUTH_API_URL;
  }
  // 开发环境使用代理，生产环境使用相对路径（通过 vercel.json rewrites）
  if (import.meta.env.DEV) {
    return ''; // 使用相对路径，通过 Vite 代理
  }
  // 生产环境也使用相对路径，通过 vercel.json 的 rewrites 转发
  return '';
};

const authConfig = {
  apiBaseUrl: getApiBaseUrl(),
  projectId: 'magic-picture-26001',
  storageKey: 'magic_picture_auth',
  tokenRefreshInterval: 5 * 60 * 1000 // 5 分钟
};

const App: React.FC = () => {
  // 开发模式下可以跳过认证
  if (DISABLE_AUTH_IN_DEV) {
    return (
      <BillingGuard>
        <Editor />
      </BillingGuard>
    );
  }

  return (
    <AuthProvider config={authConfig}>
      <AuthGuard>
        <BillingGuard>
          <Editor />
        </BillingGuard>
      </AuthGuard>
    </AuthProvider>
  );
};

export default App;