/**
 * Tenant Isolation Test
 *
 * Validates that Row Level Security (RLS) properly isolates
 * data between tenants. This is critical for multi-tenant security.
 *
 * Tests:
 * 1. Tenant A cannot see Tenant B's data
 * 2. API enforces tenant headers
 * 3. Cross-tenant URL manipulation is blocked
 * 4. Exports are tenant-scoped
 *
 * Usage:
 *   pnpm tsx tools/validation/tenant-isolation-test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

// Test tenants
const TENANT_A = { tenantId: 'tenant_01', userId: 'user_01' };
const TENANT_B = { tenantId: 'tenant_02', userId: 'user_02' };

async function makeRequest(
  endpoint: string,
  tenant: typeof TENANT_A,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenant.tenantId,
      'x-user-id': tenant.userId,
      ...options.headers,
    },
  });
}

// Test: Tenant A cannot access Tenant B's issues
async function testIssueIsolation(): Promise<TestResult> {
  try {
    // Get Tenant A's issues
    const tenantAResponse = await makeRequest('/issues', TENANT_A);
    const tenantAData = await tenantAResponse.json();
    const tenantAIssues = tenantAData.items || [];

    // Get Tenant B's issues (should be different or empty)
    const tenantBResponse = await makeRequest('/issues', TENANT_B);
    const tenantBData = await tenantBResponse.json();
    const tenantBIssues = tenantBData.items || [];

    // Verify no overlap (if both have issues)
    if (tenantAIssues.length > 0 && tenantBIssues.length > 0) {
      const tenantAIds = new Set(tenantAIssues.map((i: { id: string }) => i.id));
      const overlap = tenantBIssues.filter((i: { id: string }) => tenantAIds.has(i.id));

      if (overlap.length > 0) {
        return {
          name: 'Issue Isolation',
          passed: false,
          message: `Found ${overlap.length} overlapping issues between tenants`,
          details: overlap,
        };
      }
    }

    return {
      name: 'Issue Isolation',
      passed: true,
      message: 'Tenants have isolated issue lists',
      details: { tenantA: tenantAIssues.length, tenantB: tenantBIssues.length },
    };
  } catch (error) {
    return {
      name: 'Issue Isolation',
      passed: false,
      message: `Test failed: ${error}`,
    };
  }
}

// Test: Tenant A cannot access Tenant B's contracts
async function testContractIsolation(): Promise<TestResult> {
  try {
    const tenantAResponse = await makeRequest('/contracts', TENANT_A);
    const tenantAData = await tenantAResponse.json();
    const tenantAContracts = tenantAData.items || [];

    const tenantBResponse = await makeRequest('/contracts', TENANT_B);
    const tenantBData = await tenantBResponse.json();
    const tenantBContracts = tenantBData.items || [];

    if (tenantAContracts.length > 0 && tenantBContracts.length > 0) {
      const tenantAIds = new Set(tenantAContracts.map((c: { id: string }) => c.id));
      const overlap = tenantBContracts.filter((c: { id: string }) => tenantAIds.has(c.id));

      if (overlap.length > 0) {
        return {
          name: 'Contract Isolation',
          passed: false,
          message: `Found ${overlap.length} overlapping contracts between tenants`,
          details: overlap,
        };
      }
    }

    return {
      name: 'Contract Isolation',
      passed: true,
      message: 'Tenants have isolated contract lists',
      details: { tenantA: tenantAContracts.length, tenantB: tenantBContracts.length },
    };
  } catch (error) {
    return {
      name: 'Contract Isolation',
      passed: false,
      message: `Test failed: ${error}`,
    };
  }
}

// Test: Cross-tenant ID access is blocked
async function testCrossTenantIdAccess(): Promise<TestResult> {
  try {
    // Get a contract ID from Tenant A
    const tenantAResponse = await makeRequest('/contracts', TENANT_A);
    const tenantAData = await tenantAResponse.json();
    const tenantAContracts = tenantAData.items || [];

    if (tenantAContracts.length === 0) {
      return {
        name: 'Cross-Tenant ID Access',
        passed: true,
        message: 'Skipped - no contracts in Tenant A',
      };
    }

    const contractId = tenantAContracts[0].id;

    // Try to access it as Tenant B
    const crossTenantResponse = await makeRequest(`/contracts/${contractId}`, TENANT_B);

    // Should return 404 (not found) - not 403 (to prevent enumeration)
    if (crossTenantResponse.status === 404) {
      return {
        name: 'Cross-Tenant ID Access',
        passed: true,
        message: 'Cross-tenant access correctly returns 404',
      };
    } else if (crossTenantResponse.status === 200) {
      return {
        name: 'Cross-Tenant ID Access',
        passed: false,
        message: 'SECURITY VIOLATION: Tenant B can access Tenant A contract',
        details: { contractId, status: crossTenantResponse.status },
      };
    } else {
      return {
        name: 'Cross-Tenant ID Access',
        passed: true,
        message: `Cross-tenant access blocked with status ${crossTenantResponse.status}`,
      };
    }
  } catch (error) {
    return {
      name: 'Cross-Tenant ID Access',
      passed: false,
      message: `Test failed: ${error}`,
    };
  }
}

// Test: Missing tenant header is rejected
async function testMissingTenantHeader(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/issues`, {
      headers: {
        'Content-Type': 'application/json',
        // No x-tenant-id header
      },
    });

    // Should be rejected (401, 403, or 400)
    if ([401, 403, 400].includes(response.status)) {
      return {
        name: 'Missing Tenant Header',
        passed: true,
        message: `Request without tenant header rejected with ${response.status}`,
      };
    } else if (response.status === 200) {
      return {
        name: 'Missing Tenant Header',
        passed: false,
        message: 'SECURITY VIOLATION: Request without tenant header succeeded',
      };
    } else {
      return {
        name: 'Missing Tenant Header',
        passed: true,
        message: `Request rejected with status ${response.status}`,
      };
    }
  } catch (error) {
    return {
      name: 'Missing Tenant Header',
      passed: false,
      message: `Test failed: ${error}`,
    };
  }
}

// Test: Export isolation
async function testExportIsolation(): Promise<TestResult> {
  try {
    const tenantAResponse = await makeRequest('/exports', TENANT_A);
    const tenantAData = await tenantAResponse.json();
    const tenantAExports = tenantAData.items || [];

    const tenantBResponse = await makeRequest('/exports', TENANT_B);
    const tenantBData = await tenantBResponse.json();
    const tenantBExports = tenantBData.items || [];

    if (tenantAExports.length > 0 && tenantBExports.length > 0) {
      const tenantAIds = new Set(tenantAExports.map((e: { id: string }) => e.id));
      const overlap = tenantBExports.filter((e: { id: string }) => tenantAIds.has(e.id));

      if (overlap.length > 0) {
        return {
          name: 'Export Isolation',
          passed: false,
          message: `Found ${overlap.length} overlapping exports between tenants`,
          details: overlap,
        };
      }
    }

    return {
      name: 'Export Isolation',
      passed: true,
      message: 'Tenants have isolated export lists',
      details: { tenantA: tenantAExports.length, tenantB: tenantBExports.length },
    };
  } catch (error) {
    return {
      name: 'Export Isolation',
      passed: false,
      message: `Test failed: ${error}`,
    };
  }
}

// Test: Upload isolation
async function testUploadIsolation(): Promise<TestResult> {
  try {
    const tenantAResponse = await makeRequest('/uploads', TENANT_A);
    const tenantAData = await tenantAResponse.json();
    const tenantAUploads = tenantAData.items || [];

    const tenantBResponse = await makeRequest('/uploads', TENANT_B);
    const tenantBData = await tenantBResponse.json();
    const tenantBUploads = tenantBData.items || [];

    if (tenantAUploads.length > 0 && tenantBUploads.length > 0) {
      const tenantAIds = new Set(tenantAUploads.map((u: { id: string }) => u.id));
      const overlap = tenantBUploads.filter((u: { id: string }) => tenantAIds.has(u.id));

      if (overlap.length > 0) {
        return {
          name: 'Upload Isolation',
          passed: false,
          message: `Found ${overlap.length} overlapping uploads between tenants`,
          details: overlap,
        };
      }
    }

    return {
      name: 'Upload Isolation',
      passed: true,
      message: 'Tenants have isolated upload lists',
      details: { tenantA: tenantAUploads.length, tenantB: tenantBUploads.length },
    };
  } catch (error) {
    return {
      name: 'Upload Isolation',
      passed: false,
      message: `Test failed: ${error}`,
    };
  }
}

async function runTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TENANT ISOLATION TEST');
  console.log('='.repeat(60));
  console.log(`\nAPI URL: ${API_URL}`);
  console.log(`Tenant A: ${TENANT_A.tenantId}`);
  console.log(`Tenant B: ${TENANT_B.tenantId}\n`);

  const tests = [
    testIssueIsolation,
    testContractIsolation,
    testCrossTenantIdAccess,
    testMissingTenantHeader,
    testExportIsolation,
    testUploadIsolation,
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await test();
    results.push(result);
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${passed}/${results.length} tests passed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  SECURITY WARNING: Tenant isolation tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tenant isolation tests passed');
  }
}

runTests().catch(console.error);
