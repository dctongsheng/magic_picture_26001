import React from 'react';
import { AuthProvider } from './lib/auth';
import { AuthGuard } from './components/AuthGuard';
import { BillingGuard } from './components/BillingGuard';
import { Editor } from './components/Editor';

const authConfig = {
  apiBaseUrl: import.meta.env.VITE_AUTH_API_URL || 'https://your-auth-api.vercel.app',
  projectId: 'magic-picture-26001',
  storageKey: 'magic_picture_auth',
  tokenRefreshInterval: 5 * 60 * 1000 // 5 分钟
};

const App: React.FC = () => {
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