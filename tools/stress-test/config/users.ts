export interface TestTenant {
  tenantId: string;
  name: string;
  description: string;
}

export const TEST_TENANTS: TestTenant[] = [
  {
    tenantId: 'tenant_01',
    name: 'Primary Test Tenant',
    description: 'Main tenant for stress testing',
  },
  {
    tenantId: 'tenant_02',
    name: 'Secondary Test Tenant',
    description: 'Second tenant for multi-tenant isolation tests',
  },
  {
    tenantId: 'tenant_03',
    name: 'Tertiary Test Tenant',
    description: 'Third tenant for multi-tenant isolation tests',
  },
  {
    tenantId: 'tenant_04',
    name: 'Quaternary Test Tenant',
    description: 'Fourth tenant for extended multi-tenant tests',
  },
  {
    tenantId: 'tenant_05',
    name: 'Quinary Test Tenant',
    description: 'Fifth tenant for extended multi-tenant tests',
  },
];

/**
 * Generate test user IDs for a given tenant
 */
export function generateUserIds(count: number, tenantId: string): string[] {
  const userIds: string[] = [];
  for (let i = 0; i < count; i++) {
    userIds.push(`stress_user_${tenantId}_${i.toString().padStart(3, '0')}`);
  }
  return userIds;
}

/**
 * Get user role distribution (for future RBAC testing)
 */
export function getUserRoles() {
  return {
    admin: 10, // 10% admins
    cfo: 20, // 20% CFOs
    analyst: 70, // 70% analysts
  };
}
