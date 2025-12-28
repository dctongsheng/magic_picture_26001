# 邀请码登录系统 - 部署和使用指南

本指南将帮助您快速部署和使用邀请码认证系统。

---

## 目录

1. [系统架构](#系统架构)
2. [部署步骤](#部署步骤)
3. [使用指南](#使用指南)
4. [集成到其他项目](#集成到其他项目)
5. [常见问题](#常见问题)

---

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端项目 (当前项目)                    │
│  ┌─────────────────┐     ┌──────────────────────────┐  │
│  │  AuthGuard      │────▶│  AuthProvider (Context)  │  │
│  │  (登录守卫)       │     │  - 保存登录状态           │  │
│  └─────────────────┘     │  - 提供验证方法           │  │
│                          └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓ (HTTP请求)
┌─────────────────────────────────────────────────────────┐
│          认证 API (Vercel Serverless)                    │
│  - POST /api/auth/validate      (验证邀请码)            │
│  - GET  /api/auth/verify        (验证token)             │
│  - POST /api/admin/generate-codes (生成邀请码)          │
│                          ↓                              │
│              ┌──────────────────────┐                   │
│              │   Supabase 数据库     │                   │
│              │  - 邀请码表            │                   │
│              │  - 用户会话表          │                   │
│              └──────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

---

## 部署步骤

### 第一步：设置数据库 (Supabase)

1. 访问 [Supabase](https://supabase.com) 并注册账号
2. 创建新项目（免费版）
3. 在 SQL Editor 中执行以下 SQL：

```sql
-- 邀请码表
CREATE TABLE invite_codes (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  max_uses INT DEFAULT 100,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- 用户会话表
CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  invite_code_id VARCHAR(36),
  project_id VARCHAR(50) NOT NULL,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
);

-- 创建索引（提升性能）
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_project ON invite_codes(project_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
```

4. 保存以下信息（后续需要）：
   - Project URL
   - anon public key

### 第二步：部署认证 API (Vercel)

1. 进入 `auth-api-service` 目录：
   ```bash
   cd /Users/bws/xiangmu26/auth-api-service
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 安装 Vercel CLI：
   ```bash
   npm install -g vercel
   ```

4. 登录并部署：
   ```bash
   vercel login
   vercel link
   vercel --prod
   ```

5. 在 Vercel Dashboard 中配置环境变量：
   - `SUPABASE_URL`: 你的 Supabase Project URL
   - `SUPABASE_ANON_KEY`: 你的 Supabase anon key
   - `JWT_SECRET`: 随机生成一个密钥（例如：`openssl rand -base64 32`）
   - `ADMIN_SECRET`: 随机生成一个管理员密钥

6. 部署完成后，记录 API 地址（例如：`https://your-app.vercel.app`）

### 第三步：配置前端项目

1. 在当前项目中，已集成认证库到 `lib/auth/` 目录

2. 更新 `.env.local` 文件：
   ```bash
   # 认证服务 API 地址（替换为你的实际地址）
   VITE_AUTH_API_URL=https://your-auth-api.vercel.app

   # Gemini API Key（已有）
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

### 第四步：生成邀请码

1. 打开邀请码管理工具：
   ```bash
   open /Users/bws/xiangmu26/auth-api-service/admin/generate-codes.html
   ```

2. 填写表单：
   - **项目 ID**: `magic-picture-26001`
   - **生成数量**: 例如 `10`
   - **最大使用次数**: 例如 `100`
   - **管理员密钥**: 你设置的 ADMIN_SECRET
   - **API 地址**: 部署的认证 API 地址

3. 点击"生成邀请码"

4. 下载 CSV 或复制邀请码

---

## 使用指南

### 测试登录流程

1. 启动前端项目：
   ```bash
   npm run dev
   ```

2. 访问 `http://localhost:12001`

3. 你应该看到登录界面

4. 输入一个生成的邀请码（例如：`ABC12345`）

5. 验证成功后，进入应用主界面

6. 刷新页面，登录状态应该保持（通过 localStorage）

### 查看使用情况

在 Supabase Dashboard 的 Table Editor 中查看：
- `invite_codes` 表：查看邀请码使用情况
- `user_sessions` 表：查看活跃会话

---

## 集成到其他项目

为新的 AI 生成项目添加登录功能，只需几步：

### 方式一：复制认证库（推荐用于快速原型）

1. 将 `lib/auth/` 目录复制到新项目

2. 在新项目的 `App.tsx` 中添加：
   ```tsx
   import { AuthProvider, AuthGuard, InviteLogin } from './lib/auth';

   const authConfig = {
     apiBaseUrl: import.meta.env.VITE_AUTH_API_URL,
     projectId: 'your-new-project-id',  // 唯一标识符
   };

   export default () => (
     <AuthProvider config={authConfig}>
       <AuthGuard fallback={<InviteLogin />}>
         <YourApp />
       </AuthGuard>
     </AuthProvider>
   );
   ```

3. 添加环境变量：
   ```bash
   VITE_AUTH_API_URL=https://your-auth-api.vercel.app
   ```

### 方式二：使用 NPM 包（推荐用于生产环境）

1. 打包并发布认证库：
   ```bash
   cd /Users/bws/xiangmu26/auth-invite-system
   npm pack
   # 或
   npm publish
   ```

2. 在新项目中安装：
   ```bash
   npm install ./auth-invite-system-1.0.0.tgz
   ```

3. 使用相同的方式配置

---

## 常见问题

### Q1: 如何修改邀请码的有效期？

在 Supabase 中直接修改 `invite_codes` 表的 `expires_at` 字段：

```sql
-- 设置 30 天后过期
UPDATE invite_codes
SET expires_at = NOW() + INTERVAL '30 days'
WHERE project_id = 'magic-picture-26001';
```

### Q2: 如何禁用某个邀请码？

```sql
UPDATE invite_codes
SET is_active = false
WHERE code = 'UNWANTED_CODE';
```

### Q3: 如何查看某个邀请码的使用统计？

```sql
SELECT
  code,
  max_uses,
  used_count,
  ROUND(used_count * 100.0 / max_uses, 2) as usage_percentage
FROM invite_codes
WHERE project_id = 'magic-picture-26001'
ORDER BY used_count DESC;
```

### Q4: Token 过期后会发生什么？

Token 默认 24 小时过期。过期后：
- 下次请求时会自动验证失败
- 用户会被重新引导到登录界面
- 需要重新输入邀请码

### Q5: 可以在不同项目间共享邀请码吗？

可以。有两种方式：

1. **共享邀请码**：使用相同的 `project_id`
2. **独立邀请码**：每个项目使用不同的 `project_id`，但可以在数据库中手动复制邀请码到多个项目

### Q6: 如何提高安全性？

1. 修改默认的 JWT_SECRET 和 ADMIN_SECRET
2. 使用强密码生成密钥（`openssl rand -base64 32`）
3. 定期轮换密钥
4. 限制邀请码的使用次数
5. 监控异常登录行为

### Q7: 本地开发如何测试？

1. 使用 Vercel CLI 本地开发模式：
   ```bash
   cd auth-api-service
   vercel dev
   ```

2. 或使用 Supabase 本地开发环境

3. 更新前端 `.env.local`：
   ```bash
   VITE_AUTH_API_URL=http://localhost:3000
   ```

---

## 成本估算

使用免费 tier 的成本：

| 服务 | 免费额度 | 预计用量 | 月成本 |
|------|----------|----------|--------|
| Vercel Functions | 100K次请求/月 | ~10K次 | $0 |
| Supabase PostgreSQL | 500MB存储 | ~100MB | $0 |
| 带宽 | 100GB/月 | ~5GB | $0 |
| **总计** | - | - | **$0/月** |

当用户量增长后：
- Vercel Pro: $20/月
- Supabase Pro: $25/月
- 总计: ~$45/月（支持 10K+ 用户）

---

## 下一步

1. ✅ 部署认证 API 到 Vercel
2. ✅ 配置前端项目
3. ✅ 生成邀请码并测试
4. ✅ 集成到其他 AI 项目
5. 可选：添加更多功能（邮箱登录、OAuth 等）

---

## 支持和帮助

如有问题，请检查：
1. Supabase Dashboard 查看数据库连接
2. Vercel Dashboard 查看 API 日志
3. 浏览器控制台查看前端错误

祝您使用愉快！
