import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiBaseUrl = env.VITE_AUTH_API_URL || 'https://lyjpic-olow3ye6d-piaoyas-projects.vercel.app';
    
    return {
      server: {
        port: 12001,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: apiBaseUrl,
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path, // 保持路径不变
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
