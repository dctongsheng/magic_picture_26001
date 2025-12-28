# 邀请码认证系统 - 完整学习文档

> 从零开始构建一个可复用的登录系统，为多个 AI 生成的前端项目快速添加认证功能。

---

## 目录

1. [项目背景](#项目背景)
2. [需求分析](#需求分析)
3. [技术选型](#技术选型)
4. [系统架构设计](#系统架构设计)
5. [后端实现](#后端实现)
6. [前端实现](#前端实现)
7. [集成与部署](#集成与部署)
8. [最佳实践](#最佳实践)
9. [常见问题](#常见问题)
10. [扩展方向](#扩展方向)

---

## 项目背景

### 问题陈述

用户有多个 AI 生成的前端项目（如美食图片优化工具），每个项目都只关注功能实现，但缺少统一的登录认证系统。需要：
- 快速为项目添加登录功能
- 让功能开发人员专注于业务逻辑
- 多个项目共享统一的用户数据
- 成本低、易维护

### 项目特点

- **React + TypeScript + Vite** 技术栈
- **单页应用**，无复杂路由
- 现有简单 API Key 认证（BillingGuard 组件）
- 需要邀请码/激活码方式登录

---

## 需求分析

### 功能需求

1. **用户认证**
   - 用户输入邀请码登录
   - 验证邀请码有效性
   - 保持登录状态
   - 自动刷新 token

2. **多项目支持**
   - 同一个认证服务支持多个项目
   - 每个项目可有独立邀请码
   - 共享或隔离用户数据

3. **管理功能**
   - 批量生成邀请码
   - 设置使用次数上限
   - 查看使用统计

### 非功能需求

- ✅ **零成本**：使用免费服务
- ✅ **快速集成**：新项目 10 分钟内完成
- ✅ **易于维护**：代码集中管理
- ✅ **扩展性**：未来可添加更多登录方式
- ✅ **中文友好**：全中文界面

---

## 技术选型

### 方案对比

| 方案 | 优势 | 劣势 | 成本 | 推荐度 |
|------|------|------|------|--------|
| **自建轻量服务** | 完全控制、零成本、中文友好 | 需要维护 | 免费 tier | ★★★★★ |
| Clerk | 功能强大、集成简单 | 免费版有限制 | 免费版 5000 用户 | ★★★☆☆ |
| Auth0 | 企业级 | 复杂、昂贵 | $23/月起 | ★★☆☆☆ |
| Supabase Auth | 开源、功能全 | 中文支持弱 | 免费版 50000 用户 | ★★★★☆ |

### 最终方案：自建轻量级认证服务

**选择理由**：

1. **简单性**：邀请码验证逻辑简单，无需复杂身份提供商
2. **成本控制**：Vercel + Supabase 免费版完全够用
3. **中文友好**：完全自建，UI 和文档全中文
4. **灵活性**：易于集成到多个项目
5. **数据控制**：用户数据在自己控制下

### 技术栈

#### 后端
- **Vercel Serverless Functions** - 无服务器 API
- **Supabase PostgreSQL** - 免费数据库
- **JWT** - Token 生成和验证

#### 前端
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Context API** - 状态管理

---

## 系统架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    前端项目 1 (magic_picture)            │
│  ┌─────────────────┐     ┌──────────────────────────┐  │
│  │  AuthGuard      │────▶│  AuthProvider (Context)  │  │
│  │  (登录守卫)       │     │  - isAuthenticated      │  │
│  └─────────────────┘     │  - login/logout         │  │
│                          │  - 自动刷新 token        │  │
│                          └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│           Vercel Serverless Functions                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ POST /api/auth/validate                          │  │
│  │ - 验证邀请码                                      │  │
│  │ - 生成 JWT token                                 │  │
│  │ - 保存会话到数据库                               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ GET /api/auth/verify                             │  │
│  │ - 验证 token 有效性                               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ POST /api/admin/generate-codes                   │  │
│  │ - 批量生成邀请码                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                          ↓                              │
│              ┌──────────────────────┐                   │
│              │   Supabase 数据库     │                   │
│              │  - invite_codes      │                   │
│              │  - user_sessions     │                   │
│              └──────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### 数据库设计

#### invite_codes 表

```sql
CREATE TABLE invite_codes (
  id VARCHAR(36) PRIMARY KEY,              -- UUID
  code VARCHAR(20) UNIQUE NOT NULL,        -- 邀请码（大写）
  project_id VARCHAR(50) NOT NULL,         -- 项目标识符
  max_uses INT DEFAULT 100,                -- 最大使用次数
  used_count INT DEFAULT 0,                -- 已使用次数
  expires_at TIMESTAMP,                    -- 过期时间（可选）
  created_at TIMESTAMP DEFAULT NOW(),      -- 创建时间
  is_active BOOLEAN DEFAULT TRUE           -- 是否激活
);
```

**设计考虑**：
- `project_id` 支持多项目共享同一数据库
- `max_uses` / `used_count` 实现使用次数限制
- `expires_at` 支持临时邀请码
- `is_active` 支持禁用特定邀请码

#### user_sessions 表

```sql
CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,  -- JWT token
  invite_code_id VARCHAR(36),                  -- 关联的邀请码
  project_id VARCHAR(50) NOT NULL,
  last_active TIMESTAMP DEFAULT NOW(),         -- 最后活跃时间
  expires_at TIMESTAMP,                        -- token 过期时间
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
);
```

**设计考虑**：
- `session_token` 存储 JWT，用于验证
- `last_active` 用于活跃用户统计
- `expires_at` 实现 24 小时过期

### 认证流程图

```
用户访问应用
    ↓
检查 localStorage 是否有 token
    ↓
    ├─ 有 token → 验证 token 有效性
    │                    ↓
    │                ├─ 有效 → 进入应用
    │                └─ 无效 → 清除，显示登录页
    │
    └─ 无 token → 显示登录页面
                      ↓
              用户输入邀请码
                      ↓
              POST /api/auth/validate
                      ↓
              ├─ 验证邀请码
              ├─ 增加使用计数
              ├─ 生成 JWT token
              └─ 保存会话
                      ↓
              返回 token 给前端
                      ↓
              保存到 localStorage
                      ↓
              进入应用
                      ↓
        每 5 分钟自动刷新验证
```

---

## 后端实现

### 项目结构

```
auth-api-service/
├── api/
│   ├── auth/
│   │   ├── validate.ts      # 验证邀请码
│   │   └── verify.ts        # 验证 token
│   └── admin/
│       └── generate-codes.ts # 生成邀请码
├── lib/
│   ├── db.ts                # 数据库操作
│   └── jwt.ts               # JWT 工具
├── admin/
│   └── generate-codes.html  # 管理界面
├── package.json
├── tsconfig.json
├── vercel.json
└── .env.example
```

### 核心代码解析

#### 1. 数据库操作 (lib/db.ts)

**验证邀请码函数**：

```typescript
export async function verifyInviteCode(code: string, projectId: string) {
  // 1. 查询数据库
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code.toUpperCase())  // 大写不敏感
    .eq('project_id', projectId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return { valid: false, reason: 'Invalid invite code' };
  }

  // 2. 检查过期时间
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, reason: 'Invite code has expired' };
  }

  // 3. 检查使用次数
  if (data.used_count >= data.max_uses) {
    return { valid: false, reason: 'Invite code has reached maximum uses' };
  }

  // 4. 增加使用计数
  await supabase
    .from('invite_codes')
    .update({ used_count: data.used_count + 1 })
    .eq('id', data.id);

  return { valid: true, inviteCodeId: data.id };
}
```

**关键点**：
- 使用 `eq()` 链式调用实现多条件查询
- 检查所有业务规则（过期、次数限制）
- 原子性地增加计数（避免并发问题）

**生成邀请码函数**：

```typescript
export async function generateInviteCodes(
  projectId: string,
  quantity: number,
  maxUses: number = 100
) {
  const codes = [];

  for (let i = 0; i < quantity; i++) {
    const code = generateCode();  // 生成 8 位随机码
    codes.push({
      id: crypto.randomUUID(),
      code,
      project_id: projectId,
      max_uses: maxUses,
      used_count: 0,
      is_active: true
    });
  }

  // 批量插入
  const { data } = await supabase
    .from('invite_codes')
    .insert(codes)
    .select();

  return data;
}

// 生成不含易混淆字符的随机码
function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除 0,O,I,1
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

**关键点**：
- 批量插入提升性能
- 排除易混淆字符（0/O, I/1）
- 使用 `crypto.randomUUID()` 生成唯一 ID

#### 2. JWT 处理 (lib/jwt.ts)

```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'default-secret';

export function generateJWT(payload: object, expiresIn: string = '24h'): string {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyJWT(token: string): object | null {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
```

**使用示例**：

```typescript
// 生成 token
const token = generateJWT({
  inviteCodeId: 'abc-123',
  projectId: 'magic-picture-26001'
}); // 24 小时后过期

// 验证 token
const decoded = verifyJWT(token);
if (decoded) {
  console.log('Token valid:', decoded);
}
```

#### 3. API 端点

**验证邀请码端点 (api/auth/validate.ts)**：

```typescript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, projectId } = req.body;

  // 1. 验证邀请码
  const result = await verifyInviteCode(code, projectId);

  if (!result.valid) {
    return res.status(401).json({ success: false, error: result.reason });
  }

  // 2. 生成 JWT
  const token = generateJWT({
    inviteCodeId: result.inviteCodeId,
    projectId
  });

  // 3. 保存会话
  await saveSession(token, result.inviteCodeId, projectId);

  // 4. 返回响应
  res.status(200).json({
    success: true,
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });
}
```

**API 设计最佳实践**：
- 使用 HTTP 方法语义（GET/POST）
- 统一的错误响应格式
- 包含有用的错误信息
- 返回明确的过期时间

**验证 token 端点 (api/auth/verify.ts)**：

```typescript
export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  // 查询数据库验证
  const isValid = await verifySession(token);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.status(200).json({ valid: true });
}
```

---

## 前端实现

### 项目结构

```
auth-invite-system/
├── src/
│   ├── components/
│   │   ├── AuthProvider.tsx    # Context Provider
│   │   ├── AuthGuard.tsx       # 路由守卫
│   │   └── InviteLogin.tsx     # 登录界面
│   ├── hooks/
│   │   └── useRequireAuth.ts   # 强制认证 Hook
│   ├── services/
│   │   └── authService.ts      # API 调用服务
│   ├── types/
│   │   └── index.ts            # TypeScript 类型
│   ├── utils/
│   │   ├── storage.ts          # localStorage 封装
│   │   └── validation.ts       # 验证工具
│   └── index.ts                # 主入口
├── package.json
├── tsconfig.json
└── README.md
```

### 核心代码解析

#### 1. AuthProvider（状态管理）

```typescript
const AuthContext = createContext<AuthContextValue | null>(null);

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

  // 自动刷新 token（每 5 分钟）
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
    }, config.tokenRefreshInterval || 5 * 60 * 1000);

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**设计要点**：
- 使用 Context API 实现全局状态
- `useCallback` 避免不必要的重新渲染
- 自动验证和刷新 token
- 清晰的错误处理

#### 2. AuthService（API 调用）

```typescript
export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async validateInviteCode(code: string): Promise<ValidateInviteResponse> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          projectId: this.config.projectId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 保存到 localStorage
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
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${this.config.storageKey || 'auth'}_${key}`;
  }
}
```

**设计要点**：
- 类封装，易于测试
- 统一的错误处理
- 自动保存会话到 localStorage
- 配置化的存储键名

#### 3. InviteLogin（登录界面）

```typescript
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          {logo || <KeyRound size={32} />}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">{title}</h2>
        <p className="text-gray-600 mb-6 text-center">{description}</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            className="w-full px-4 py-3 border rounded-lg text-center text-lg tracking-widest uppercase"
            autoFocus
            disabled={loading}
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 px-4 font-semibold rounded-lg text-white"
          >
            {loading ? 'Verifying...' : 'Access Now'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

**UI/UX 要点**：
- 自动转大写，用户友好
- 清晰的错误提示
- 加载状态反馈
- 可自定义主题
- 响应式设计

#### 4. AuthGuard（路由守卫）

```typescript
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

**使用示例**：

```tsx
<AuthProvider config={authConfig}>
  <AuthGuard fallback={<InviteLogin />}>
    <ProtectedComponent />
  </AuthGuard>
</AuthProvider>
```

---

## 集成与部署

### 在当前项目中集成

#### 1. 创建认证库目录

```bash
mkdir -p lib/auth/{components,hooks,services,types,utils}
```

#### 2. 复制认证库文件

将 `auth-invite-system/src/` 下的所有文件复制到 `lib/auth/`

#### 3. 创建入口文件

```typescript
// lib/auth/index.ts
export { AuthProvider, useAuth } from './components/AuthProvider';
export { AuthGuard } from './components/AuthGuard';
export { InviteLogin } from './components/InviteLogin';
export { useRequireAuth } from './hooks/useRequireAuth';
export { AuthService } from './services/authService';
export type { AuthConfig, AuthSession } from './types';
```

#### 4. 修改 App.tsx

```tsx
import { AuthProvider } from './lib/auth';
import { AuthGuard } from './components/AuthGuard';
import { BillingGuard } from './components/BillingGuard';
import { Editor } from './components/Editor';

const authConfig = {
  apiBaseUrl: import.meta.env.VITE_AUTH_API_URL,
  projectId: 'magic-picture-26001',
  storageKey: 'magic_picture_auth'
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
```

**认证层次**：
```
AuthProvider (最外层 - 提供认证上下文)
  ↓
AuthGuard (邀请码认证)
  ↓
BillingGuard (API Key 认证)
  ↓
Editor (主功能)
```

#### 5. 配置环境变量

```bash
# .env.local
VITE_AUTH_API_URL=https://your-auth-api.vercel.app
GEMINI_API_KEY=your_gemini_api_key
```

### 部署到 Vercel

#### 1. 准备 Supabase

```bash
# 1. 访问 https://supabase.com 创建项目
# 2. 在 SQL Editor 执行：
```

```sql
CREATE TABLE invite_codes (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  max_uses INT DEFAULT 100,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  invite_code_id VARCHAR(36),
  project_id VARCHAR(50) NOT NULL,
  last_active TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
```

#### 2. 部署 API

```bash
cd auth-api-service

# 安装依赖
npm install

# 登录 Vercel
npm install -g vercel
vercel login

# 部署
vercel --prod
```

#### 3. 配置环境变量

在 Vercel Dashboard 中添加：

| 名称 | 值 | 说明 |
|------|-----|------|
| SUPABASE_URL | your-project-url | Supabase 项目 URL |
| SUPABASE_ANON_KEY | your-anon-key | Supabase 匿名密钥 |
| JWT_SECRET | random-string | JWT 签名密钥 |
| ADMIN_SECRET | random-string | 管理员密钥 |

**生成密钥**：
```bash
openssl rand -base64 32
```

#### 4. 生成邀请码

打开管理工具：
```bash
open auth-api-service/admin/generate-codes.html
```

填写：
- 项目 ID: `magic-picture-26001`
- 生成数量: `10`
- 最大使用次数: `100`
- 管理员密钥: `your-admin-secret`
- API 地址: `https://your-api.vercel.app`

点击"生成邀请码"，然后下载 CSV。

---

## 最佳实践

### 1. 安全性

#### 密钥管理
```bash
# ✅ 使用环境变量
JWT_SECRET=your-random-secret-key

# ❌ 不要硬编码
const SECRET = 'my-secret-key';
```

#### Token 验证
```typescript
// ✅ 验证每个请求
const isValid = await authService.verifyToken(token);
if (!isValid) {
  // 清除会话，重新登录
  logout();
}

// ❌ 不要只检查 localStorage
const hasToken = localStorage.getItem('token');
```

#### HTTPS 强制
```typescript
// ✅ 生产环境使用 HTTPS
const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? 'https://your-api.vercel.app'
  : 'http://localhost:3000';
```

### 2. 用户体验

#### 加载状态
```tsx
// ✅ 显示加载状态
{isLoading ? (
  <LoadingSpinner />
) : (
  <Content />
)}

// ❌ 不要空白页面
{isAuthenticated && <Content />}
```

#### 错误提示
```tsx
// ✅ 清晰的错误信息
{error && (
  <div className="p-3 bg-red-50 text-red-700 rounded-lg">
    {error}
  </div>
)}

// ❌ 不要用 alert()
alert('Login failed');
```

#### 自动聚焦
```tsx
<input
  autoFocus  // 自动聚焦输入框
  placeholder="Enter invite code"
/>
```

### 3. 性能优化

#### 防抖处理
```typescript
// ✅ 避免频繁请求
const debouncedVerify = debounce(
  () => authService.verifyToken(token),
  1000
);
```

#### 缓存验证结果
```typescript
// ✅ 缓存验证结果，避免重复请求
const [isValid, setIsValid] = useState<boolean | null>(null);

useEffect(() => {
  if (isValid === null) {
    verifyToken().then(setIsValid);
  }
}, [token]);
```

#### 批量操作
```sql
-- ✅ 批量插入
INSERT INTO invite_codes (id, code, ...) VALUES
  (...),
  (...),
  (...);

-- ❌ 不要循环插入
INSERT INTO invite_codes (...) VALUES (...);
INSERT INTO invite_codes (...) VALUES (...);
```

### 4. 代码组织

#### 单一职责
```typescript
// ✅ 每个模块只做一件事
class AuthService {
  validateInviteCode() { }
  verifyToken() { }
}

// ❌ 不要把所有逻辑放在一个文件
class AuthManager {
  validateInviteCode() { }
  verifyToken() { }
  renderLogin() { }
  saveToDatabase() { }
}
```

#### 类型安全
```typescript
// ✅ 使用 TypeScript 类型
interface AuthConfig {
  apiBaseUrl: string;
  projectId: string;
}

// ❌ 不要使用 any
function login(config: any) { }
```

#### 错误处理
```typescript
// ✅ 统一的错误处理
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  console.error('API error:', error);
  return { success: false, error: 'Network error' };
}

// ❌ 不要让错误崩溃
const result = await apiCall();
```

---

## 常见问题

### Q1: 如何修改邀请码长度？

**A**: 修改 `lib/db.ts` 中的 `generateCode()` 函数：

```typescript
function generateCode(length: number = 12): string {  // 改为 12 位
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

### Q2: 如何实现记住我功能？

**A**: 延长 token 有效期：

```typescript
// api/auth/validate.ts
const token = generateJWT(payload, '30d');  // 30 天有效

// 前端添加复选框
<label>
  <input type="checkbox" onChange={(e) => {
    const expiry = e.target.checked ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    // 使用不同的过期时间
  }} />
  Remember me
</label>
```

### Q3: 如何实现登出所有设备？

**A**: 删除数据库中的所有会话：

```typescript
// api/auth/logout-all.ts
export async function logoutAll(userId: string) {
  await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);
}
```

### Q4: 如何限流防止暴力破解？

**A**: 使用 Vercel 的速率限制或添加中间件：

```typescript
// 简单的内存限流
const attempts = new Map<string, number>();

export function rateLimit(ip: string, maxAttempts: number = 5) {
  const current = attempts.get(ip) || 0;
  if (current >= maxAttempts) {
    throw new Error('Too many attempts');
  }
  attempts.set(ip, current + 1);

  // 1 分钟后重置
  setTimeout(() => attempts.delete(ip), 60000);
}
```

### Q5: 如何添加邮箱登录？

**A**: 扩展数据库和 API：

```sql
-- 添加用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

```typescript
// api/auth/login-email.ts
export async function loginWithEmail(email: string, password: string) {
  // 验证邮箱密码
  // 生成 token
  // 返回结果
}
```

### Q6: 如何查看在线用户？

**A**: 查询活跃会话：

```sql
SELECT
  s.project_id,
  COUNT(*) as online_users,
  MAX(s.last_active) as last_activity
FROM user_sessions s
WHERE s.expires_at > NOW()
  AND s.last_active > NOW() - INTERVAL '15 minutes'
GROUP BY s.project_id;
```

---

## 扩展方向

### 1. 添加更多登录方式

```typescript
interface LoginMethod {
  type: 'invite' | 'email' | 'phone' | 'oauth';
  validate(credentials: any): Promise<boolean>;
}

class EmailLogin implements LoginMethod {
  async validate({ email, password }) {
    // 验证邮箱密码
  }
}

class OAuthLogin implements LoginMethod {
  async validate({ provider, token }) {
    // 验证 OAuth token
  }
}
```

### 2. 添加用户权限系统

```sql
-- 角色表
CREATE TABLE roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- 权限表
CREATE TABLE permissions (
  id VARCHAR(36) PRIMARY KEY,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL
);

-- 用户角色关联
CREATE TABLE user_roles (
  user_id VARCHAR(36),
  role_id VARCHAR(36),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

### 3. 添加审计日志

```sql
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(100),
  resource VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. 添加 2FA 双因素认证

```typescript
// 使用 OTP 库
import OTPAuth from 'otpauth';

// 生成 TOTP secret
const totp = new OTPAuth.TOTP({
  issuer: 'MyApp',
  label: 'user@example.com',
  algorithm: 'SHA1',
  digits: 6,
  period: 30
});

// 验证 OTP
const delta = totp.validate({ token: userToken });
if (delta === null) {
  // Invalid token
}
```

### 5. 添加用户分析

```typescript
// 跟踪用户行为
export async function trackEvent(userId: string, event: string, metadata: any) {
  await supabase.from('analytics').insert({
    user_id: userId,
    event,
    metadata,
    timestamp: new Date()
  });
}

// 使用示例
await trackEvent(userId, 'login', { method: 'invite_code' });
await trackEvent(userId, 'feature_used', { feature: 'image_edit' });
```

---

## 总结

### 关键要点

1. **架构设计**
   - 前后端分离
   - RESTful API
   - JWT 认证
   - Context 状态管理

2. **技术选型**
   - Vercel + Supabase（零成本）
   - React + TypeScript（类型安全）
   - JWT（无状态认证）

3. **最佳实践**
   - 环境变量管理密钥
   - 统一的错误处理
   - 自动 token 刷新
   - 清晰的代码组织

4. **可扩展性**
   - 支持多项目
   - 可添加多种登录方式
   - 模块化设计

### 学习路径

1. **基础**：理解 JWT 和认证流程
2. **进阶**：学习 React Context 和状态管理
3. **高级**：掌握 Serverless 和数据库设计
4. **实践**：部署到生产环境

### 资源链接

- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [JWT.io](https://jwt.io/)
- [React Context API](https://react.dev/reference/react/useContext)

---

**祝你学习愉快！如有问题，随时提问。**
