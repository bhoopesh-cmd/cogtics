import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export interface UserConfig {
  userId: string;
  tenantId: string;
  token: string;
  uploadCount: number;
  delayBetweenUploads: number;
}

/**
 * Generate JWT token for a test user
 * Based on: Tech/apps/api/src/plugins/auth.ts
 */
export async function generateToken(userId: string, tenantId: string): Promise<string> {
  const jwt = await new jose.SignJWT({ sub: userId, tid: tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET));

  return jwt;
}

/**
 * Pre-generate tokens for multiple test users
 */
export async function generateTestUsers(
  count: number,
  tenantId: string,
  config: Partial<Omit<UserConfig, 'userId' | 'tenantId' | 'token'>> = {}
): Promise<UserConfig[]> {
  const users: UserConfig[] = [];

  for (let i = 0; i < count; i++) {
    const userId = `stress_user_${i.toString().padStart(3, '0')}`;
    const token = await generateToken(userId, tenantId);

    users.push({
      userId,
      tenantId,
      token,
      uploadCount: config.uploadCount ?? 10,
      delayBetweenUploads: config.delayBetweenUploads ?? 100,
    });
  }

  return users;
}

/**
 * Generate users across multiple tenants
 */
export async function generateMultiTenantUsers(
  usersPerTenant: number,
  tenantIds: string[]
): Promise<Map<string, UserConfig[]>> {
  const tenantUsers = new Map<string, UserConfig[]>();

  for (const tenantId of tenantIds) {
    const users = await generateTestUsers(usersPerTenant, tenantId);
    tenantUsers.set(tenantId, users);
  }

  return tenantUsers;
}
