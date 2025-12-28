import React, { useState } from 'react';
import { KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * InviteLogin 属性
 */
export interface InviteLoginProps {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** Logo 图标 */
  logo?: React.ReactNode;
  /** 自定义主题 */
  customTheme?: {
    /** 主色调 */
    primaryColor?: string;
    /** 背景色 */
    backgroundColor?: string;
  };
}

/**
 * 邀请码登录界面组件
 *
 * @example
 * ```tsx
 * <InviteLogin
 *   title="Welcome"
 *   description="Enter your invite code to continue"
 *   logo={<YourLogo />}
 * />
 * ```
 */
export const InviteLogin: React.FC<InviteLoginProps> = ({
  title = 'Access Required',
  description = 'Please enter your invite code to continue',
  logo,
  customTheme = {}
}) => {
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(code);
    } catch (err: any) {
      setError(err.message || 'Invalid invite code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = customTheme.primaryColor || '#4F46E5';
  const bgColor = customTheme.backgroundColor || '#F9FAFB';

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: bgColor }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        {/* Logo */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: `${primaryColor}10` }}>
          {logo || <KeyRound size={32} style={{ color: primaryColor }} />}
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{title}</h2>
        <p className="text-gray-600 mb-6 text-center">{description}</p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Enter invite code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-lg tracking-widest uppercase"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 px-4 font-semibold rounded-lg text-white transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor }}
            onMouseEnter={(e) => {
              if (!loading && code.trim()) {
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Verifying...
              </>
            ) : (
              'Access Now'
            )}
          </button>
        </form>

        {/* Help Text */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          Invite codes are case-sensitive and one-time use per device
        </p>
      </div>
    </div>
  );
};
