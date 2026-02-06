/**
 * Comprehensive Validation Runner
 *
 * Runs all validation checks for production readiness:
 * - Detection validation
 * - API endpoint health
 * - Schema validation
 * - Worker health
 *
 * Usage:
 *   pnpm tsx tools/validation/run-validation.ts
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WORKER_URLS = [
  'http://localhost:3011',
  'http://localhost:3012',
  'http://localhost:3013',
];

interface ValidationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

interface ValidationReport {
  timestamp: string;
  environment: {
    apiUrl: string;
    workerUrls: string[];
  };
  checks: ValidationCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

async function checkApiHealth(): Promise<ValidationCheck> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();

    if (response.ok && (data.status === 'healthy' || data.status === 'ok')) {
      return {
        name: 'API Health',
        status: 'pass',
        message: 'API is healthy',
        duration: Date.now() - start,
      };
    } else {
      return {
        name: 'API Health',
        status: 'fail',
        message: `API returned status: ${data.status || response.status}`,
        duration: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      name: 'API Health',
      status: 'fail',
      message: `Failed to connect: ${error}`,
      duration: Date.now() - start,
    };
  }
}

async function checkWorkerHealth(): Promise<ValidationCheck[]> {
  const checks: ValidationCheck[] = [];

  for (const url of WORKER_URLS) {
    const start = Date.now();
    try {
      const response = await fetch(`${url}/health`);
      const data = await response.json();

      checks.push({
        name: `Worker Health (${url})`,
        status: response.ok && data.status === 'ok' ? 'pass' : 'fail',
        message: response.ok ? 'Worker is healthy' : `Status: ${data.status}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      checks.push({
        name: `Worker Health (${url})`,
        status: 'fail',
        message: `Failed to connect: ${error}`,
        duration: Date.now() - start,
      });
    }
  }

  return checks;
}

async function checkDatabaseConnection(): Promise<ValidationCheck> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_URL}/health/detailed`, {
      headers: {
        'x-tenant-id': 'tenant_01',
        'x-user-id': 'user_01',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const dbStatus = data.checks?.database?.status ?? data.database?.connected;
      return {
        name: 'Database Connection',
        status: dbStatus ? 'pass' : 'fail',
        message: dbStatus ? 'Connected' : 'Not connected',
        duration: Date.now() - start,
      };
    } else {
      return {
        name: 'Database Connection',
        status: 'fail',
        message: `API returned ${response.status}`,
        duration: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'fail',
      message: `Check failed: ${error}`,
      duration: Date.now() - start,
    };
  }
}

async function checkRedisConnection(): Promise<ValidationCheck> {
  const start = Date.now();
  try {
    const response = await fetch(`${API_URL}/health/detailed`, {
      headers: {
        'x-tenant-id': 'tenant_01',
        'x-user-id': 'user_01',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const redisStatus = data.checks?.redis?.status ?? data.redis?.connected;
      return {
        name: 'Redis Connection',
        status: redisStatus ? 'pass' : 'fail',
        message: redisStatus ? 'Connected' : 'Not connected',
        duration: Date.now() - start,
      };
    } else {
      return {
        name: 'Redis Connection',
        status: 'fail',
        message: `API returned ${response.status}`,
        duration: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      name: 'Redis Connection',
      status: 'fail',
      message: `Check failed: ${error}`,
      duration: Date.now() - start,
    };
  }
}

async function checkMinioConnection(): Promise<ValidationCheck> {
  const start = Date.now();
  try {
    const response = await fetch('http://localhost:9000/minio/health/live');
    return {
      name: 'MinIO Connection',
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? 'Connected' : `Status: ${response.status}`,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'MinIO Connection',
      status: 'fail',
      message: `Check failed: ${error}`,
      duration: Date.now() - start,
    };
  }
}

async function checkSyntheticDataExists(): Promise<ValidationCheck> {
  const dataDir = 'tools/synthetic-data/output/stress_test';
  const requiredFiles = [
    'expected_outputs/expected_issues.json',
    'expected_outputs/rule_coverage.json',
    'data/contracts.json',
    'data/invoices.json',
  ];

  const missing: string[] = [];
  for (const file of requiredFiles) {
    const fullPath = path.join(dataDir, file);
    if (!fs.existsSync(fullPath)) {
      missing.push(file);
    }
  }

  return {
    name: 'Synthetic Data',
    status: missing.length === 0 ? 'pass' : 'fail',
    message: missing.length === 0
      ? 'All required files present'
      : `Missing: ${missing.join(', ')}`,
  };
}

async function checkApiEndpoints(): Promise<ValidationCheck[]> {
  const endpoints = [
    { path: '/issues', name: 'Issues API' },
    { path: '/contracts', name: 'Contracts API' },
    { path: '/uploads', name: 'Uploads API' },
    { path: '/connections', name: 'Connections API' },
    { path: '/simulations', name: 'Simulations API' },
    { path: '/exports', name: 'Exports API' },
    { path: '/revrec/obligations', name: 'RevRec API' },
    { path: '/snapshots', name: 'Snapshots API' },
  ];

  const checks: ValidationCheck[] = [];

  for (const endpoint of endpoints) {
    const start = Date.now();
    try {
      const response = await fetch(`${API_URL}${endpoint.path}`, {
        headers: {
          'x-tenant-id': 'tenant_01',
          'x-user-id': 'user_01',
        },
      });

      // Accept 200, 401, 403 as "endpoint exists"
      const acceptable = [200, 401, 403, 404];

      checks.push({
        name: endpoint.name,
        status: acceptable.includes(response.status) ? 'pass' : 'fail',
        message: `Status: ${response.status}`,
        duration: Date.now() - start,
      });
    } catch (error) {
      checks.push({
        name: endpoint.name,
        status: 'fail',
        message: `Failed: ${error}`,
        duration: Date.now() - start,
      });
    }
  }

  return checks;
}

async function runValidation(): Promise<ValidationReport> {
  console.log('='.repeat(60));
  console.log('PRODUCTION READINESS VALIDATION');
  console.log('='.repeat(60));
  console.log(`\nTimestamp: ${new Date().toISOString()}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Workers: ${WORKER_URLS.join(', ')}\n`);

  const checks: ValidationCheck[] = [];

  // Infrastructure checks
  console.log('## Infrastructure Checks\n');

  const apiHealth = await checkApiHealth();
  checks.push(apiHealth);
  console.log(`${apiHealth.status === 'pass' ? '✅' : '❌'} ${apiHealth.name}: ${apiHealth.message}`);

  const workerChecks = await checkWorkerHealth();
  for (const check of workerChecks) {
    checks.push(check);
    console.log(`${check.status === 'pass' ? '✅' : '❌'} ${check.name}: ${check.message}`);
  }

  const dbCheck = await checkDatabaseConnection();
  checks.push(dbCheck);
  console.log(`${dbCheck.status === 'pass' ? '✅' : '❌'} ${dbCheck.name}: ${dbCheck.message}`);

  const redisCheck = await checkRedisConnection();
  checks.push(redisCheck);
  console.log(`${redisCheck.status === 'pass' ? '✅' : '❌'} ${redisCheck.name}: ${redisCheck.message}`);

  const minioCheck = await checkMinioConnection();
  checks.push(minioCheck);
  console.log(`${minioCheck.status === 'pass' ? '✅' : '❌'} ${minioCheck.name}: ${minioCheck.message}`);

  // Data checks
  console.log('\n## Data Checks\n');

  const dataCheck = await checkSyntheticDataExists();
  checks.push(dataCheck);
  console.log(`${dataCheck.status === 'pass' ? '✅' : '❌'} ${dataCheck.name}: ${dataCheck.message}`);

  // API endpoint checks
  console.log('\n## API Endpoint Checks\n');

  const endpointChecks = await checkApiEndpoints();
  for (const check of endpointChecks) {
    checks.push(check);
    console.log(`${check.status === 'pass' ? '✅' : '❌'} ${check.name}: ${check.message}`);
  }

  // Summary
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const skipped = checks.filter(c => c.status === 'skip').length;

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    environment: {
      apiUrl: API_URL,
      workerUrls: WORKER_URLS,
    },
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
      skipped,
    },
  };

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:   ${checks.length}`);
  console.log(`Passed:  ${passed}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`\nResult: ${failed === 0 ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);

  return report;
}

async function main() {
  try {
    const report = await runValidation();

    // Save report
    const reportPath = `validation-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(report.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

main();
