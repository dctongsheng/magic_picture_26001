/**
 * 验证工具函数
 */

/**
 * 验证邀请码格式
 */
export function validateInviteCodeFormat(code: string): boolean {
  // 邀请码应该是 4-20 位，只包含字母和数字
  const regex = /^[A-Z0-9]{4,20}$/;
  return regex.test(code.toUpperCase());
}

/**
 * 格式化邀请码（转大写并去除空格）
 */
export function formatInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * 检查 token 是否过期
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * 计算剩余时间（秒）
 */
export function getTimeRemaining(expiresAt: number): number {
  const remaining = Math.max(0, expiresAt - Date.now());
  return Math.floor(remaining / 1000);
}
