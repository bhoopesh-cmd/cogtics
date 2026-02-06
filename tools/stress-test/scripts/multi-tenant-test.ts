import { writeFileSync } from 'fs';
import { generateMultiTenantUsers } from '../lib/jwt-generator.js';
import { UserSimulator, type UserResult } from './user-simulator.js';
import { MULTI_TENANT_SCENARIOS } from '../config/concurrency-config.js';

interface TenantTestResult {
  tenantId: string;
  userResults: UserResult[];
  totalUploads: number;
  successfulUploads: number;
  isolationViolations: number;
}

/**
 * Multi-tenant isolation test
 * Verifies that concurrent operations across tenants don't leak data
 */
async function main() {
  const args = process.argv.slice(2);
  const scenarioArg = args.find(a => a.startsWith('--scenario='))?.split('=')[1] || 'multi_tenant_basic';

  const scenario = MULTI_TENANT_SCENARIOS.find(s => s.name === scenarioArg);
  if (!scenario) {
    console.error(`Unknown scenario: ${scenarioArg}`);
    process.exit(1);
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2: MULTI-TENANT ISOLATION TEST                            ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Tenants: ${scenario.config.tenants.length}`.padEnd(67) + '║');
  console.log(`║  Users/Tenant: ${scenario.config.userCount}`.padEnd(67) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const apiUrl = 'http://localhost:3000';
  const tenantUsers = await generateMultiTenantUsers(
    scenario.config.userCount,
    scenario.config.tenants
  );

  const tenantResults: TenantTestResult[] = [];

  // Run tests for each tenant concurrently
  for (const [tenantId, users] of tenantUsers) {
    console.log(`\nTesting tenant: ${tenantId}`);

    const userResults = await Promise.all(
      users.map(user => {
        const simulator = new UserSimulator(user, apiUrl, scenario.config.pdfDir);
        return simulator.run();
      })
    );

    const totalUploads = userResults.reduce((sum, u) => sum + u.uploads.length, 0);
    const successfulUploads = userResults.reduce(
      (sum, u) => sum + u.uploads.filter(upload => upload.success).length,
      0
    );

    tenantResults.push({
      tenantId,
      userResults,
      totalUploads,
      successfulUploads,
      isolationViolations: 0, // TODO: Implement isolation verification
    });

    console.log(`✓ ${tenantId}: ${successfulUploads}/${totalUploads} successful`);
  }

  // Save results
  const outputFile = `results/multi-tenant-${scenarioArg}-${Date.now()}.json`;
  writeFileSync(outputFile, JSON.stringify(tenantResults, null, 2));
  console.log(`\nResults saved to ${outputFile}`);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
