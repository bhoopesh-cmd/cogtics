/**
 * Database seed script for development
 * Seeds roles, permissions, and a test tenant with users
 */

import { getDatabase, closeDatabase } from './client.js';
import { createTenantId, createUserId, createRoleId, createPermissionId, createMembershipId } from '@cogtics/schemas';

const ROLES = [
  { id: 'role_admin', name: 'Admin' },
  { id: 'role_cfo', name: 'CFO' },
  { id: 'role_analyst', name: 'Analyst' },
] as const;

const PERMISSIONS = [
  { id: 'perm_tenant_manage', name: 'tenant.manage', description: 'Manage tenant settings' },
  { id: 'perm_user_manage', name: 'user.manage', description: 'Manage users and memberships' },
  { id: 'perm_audit_read', name: 'audit.read', description: 'Read audit logs' },
  { id: 'perm_jobs_enqueue', name: 'jobs.enqueue', description: 'Enqueue background jobs' },
  { id: 'perm_exports_read', name: 'exports.read', description: 'Access export functionality' },
  { id: 'perm_contracts_read', name: 'contracts.read', description: 'Read contracts' },
  { id: 'perm_issues_read', name: 'issues.read', description: 'Read detected issues' },
  { id: 'perm_simulations_run', name: 'simulations.run', description: 'Run revenue simulations' },
  { id: 'perm_revrec_read', name: 'revrec.read', description: 'Read revenue recognition data' },
  { id: 'perm_integrations_manage', name: 'integrations.manage', description: 'Manage integrations' },
] as const;

// Role-permission mappings
const ROLE_PERMISSIONS: Record<string, string[]> = {
  role_admin: [
    'perm_tenant_manage',
    'perm_user_manage',
    'perm_audit_read',
    'perm_jobs_enqueue',
    'perm_exports_read',
    'perm_contracts_read',
    'perm_issues_read',
    'perm_simulations_run',
    'perm_revrec_read',
    'perm_integrations_manage',
  ],
  role_cfo: [
    'perm_audit_read',
    'perm_exports_read',
    'perm_contracts_read',
    'perm_issues_read',
    'perm_simulations_run',
    'perm_revrec_read',
  ],
  role_analyst: [
    'perm_contracts_read',
    'perm_issues_read',
    'perm_revrec_read',
  ],
};

async function seed() {
  console.log('Starting database seed...');
  
  const db = getDatabase();

  try {
    // Seed roles
    console.log('Seeding roles...');
    for (const role of ROLES) {
      await db
        .insertInto('roles')
        .values({ id: role.id, name: role.name })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
    }

    // Seed permissions
    console.log('Seeding permissions...');
    for (const perm of PERMISSIONS) {
      await db
        .insertInto('permissions')
        .values({ id: perm.id, name: perm.name, description: perm.description })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();
    }

    // Seed role-permission mappings
    console.log('Seeding role-permission mappings...');
    for (const [roleId, permIds] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permId of permIds) {
        await db
          .insertInto('role_permissions')
          .values({ role_id: roleId, permission_id: permId })
          .onConflict((oc) => oc.columns(['role_id', 'permission_id']).doNothing())
          .execute();
      }
    }

    // Create test tenant
    console.log('Creating test tenant...');
    const testTenantId = 'tenant_01';
    await db
      .insertInto('tenants')
      .values({
        id: testTenantId,
        name: 'Test Company',
        status: 'active',
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    // Create test users
    console.log('Creating test users...');
    const testUsers = [
      { id: 'user_01', email: 'admin@test.com', name: 'Admin User', roleId: 'role_admin' },
      { id: 'user_02', email: 'cfo@test.com', name: 'CFO User', roleId: 'role_cfo' },
      { id: 'user_03', email: 'analyst@test.com', name: 'Analyst User', roleId: 'role_analyst' },
    ];

    for (const user of testUsers) {
      await db
        .insertInto('users')
        .values({
          id: user.id,
          email: user.email,
          name: user.name,
          status: 'active',
        })
        .onConflict((oc) => oc.column('id').doNothing())
        .execute();

      // Create membership
      await db
        .insertInto('memberships')
        .values({
          id: `mem_${user.id}`,
          tenant_id: testTenantId,
          user_id: user.id,
          role_id: user.roleId,
        })
        .onConflict((oc) => oc.columns(['tenant_id', 'user_id']).doNothing())
        .execute();
    }

    console.log('Seed completed successfully!');
    console.log('');
    console.log('Test credentials:');
    console.log('  Tenant ID: tenant_01');
    console.log('  Admin:     user_01 (admin@test.com)');
    console.log('  CFO:       user_02 (cfo@test.com)');
    console.log('  Analyst:   user_03 (analyst@test.com)');
  } finally {
    await closeDatabase();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

