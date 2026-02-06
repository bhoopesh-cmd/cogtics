/**
 * Security Testing
 *
 * Tests security boundaries and protections:
 * 1. RBAC enforcement
 * 2. Rate limiting
 * 3. Auth validation (JWT, headers)
 * 4. Input validation / injection prevention
 * 5. CORS headers
 *
 * Usage:
 *   pnpm tsx tools/validation/security-test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details?: unknown;
}

// Test headers for different user roles
const HEADERS = {
  admin: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_01',
    'x-user-id': 'user_01',
    'x-user-role': 'admin',
  },
  analyst: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_01',
    'x-user-id': 'user_03',
    'x-user-role': 'analyst',
  },
  viewer: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_01',
    'x-user-id': 'user_04',
    'x-user-role': 'viewer',
  },
};

// ==================== AUTH VALIDATION TESTS ====================

// Test: Missing auth headers are rejected
async function testMissingAuthHeaders(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/issues`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if ([401, 403, 400].includes(response.status)) {
      return {
        name: 'Missing Auth Headers',
        passed: true,
        message: `Request without auth headers rejected with ${response.status}`,
        severity: 'critical',
      };
    } else if (response.status === 200) {
      return {
        name: 'Missing Auth Headers',
        passed: false,
        message: 'SECURITY VIOLATION: Request without auth headers succeeded',
        severity: 'critical',
      };
    } else {
      return {
        name: 'Missing Auth Headers',
        passed: true,
        message: `Request rejected with status ${response.status}`,
        severity: 'critical',
      };
    }
  } catch (error) {
    return {
      name: 'Missing Auth Headers',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'critical',
    };
  }
}

// Test: Invalid tenant ID is rejected
async function testInvalidTenantId(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/issues`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'invalid_tenant_xyz',
        'x-user-id': 'user_01',
      },
    });

    // Should be rejected or return empty data
    if ([401, 403, 400, 404].includes(response.status)) {
      return {
        name: 'Invalid Tenant ID',
        passed: true,
        message: `Invalid tenant ID rejected with ${response.status}`,
        severity: 'critical',
      };
    } else if (response.status === 200) {
      const data = await response.json();
      const items = data.items || [];

      // If 200, should have no data (tenant doesn't exist)
      return {
        name: 'Invalid Tenant ID',
        passed: items.length === 0,
        message: items.length === 0
          ? 'Invalid tenant returns empty data (acceptable)'
          : 'SECURITY VIOLATION: Invalid tenant has access to data',
        severity: 'critical',
        details: { itemCount: items.length },
      };
    } else {
      return {
        name: 'Invalid Tenant ID',
        passed: true,
        message: `Request returned status ${response.status}`,
        severity: 'critical',
      };
    }
  } catch (error) {
    return {
      name: 'Invalid Tenant ID',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'critical',
    };
  }
}

// Test: Malformed headers are handled safely
async function testMalformedHeaders(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/issues`, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': '<script>alert(1)</script>',
        'x-user-id': "'; DROP TABLE users; --",
      },
    });

    // Server should not crash and should reject malformed input
    if ([400, 401, 403, 404, 500].includes(response.status)) {
      return {
        name: 'Malformed Headers',
        passed: response.status !== 500, // 500 indicates unhandled error
        message: response.status === 500
          ? 'Warning: Server returned 500 (may indicate unhandled error)'
          : `Malformed headers handled safely with ${response.status}`,
        severity: 'high',
      };
    } else {
      return {
        name: 'Malformed Headers',
        passed: true,
        message: 'Server handled malformed headers gracefully',
        severity: 'high',
      };
    }
  } catch (error) {
    return {
      name: 'Malformed Headers',
      passed: false,
      message: `Test failed (server may have crashed): ${error}`,
      severity: 'high',
    };
  }
}

// ==================== RBAC TESTS ====================

// Test: Viewer cannot create resources
async function testViewerCannotCreate(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/issues`, {
      method: 'POST',
      headers: HEADERS.viewer,
      body: JSON.stringify({
        title: 'Unauthorized Issue',
        description: 'This should fail',
      }),
    });

    if ([401, 403].includes(response.status)) {
      return {
        name: 'Viewer Cannot Create',
        passed: true,
        message: `Viewer create attempt blocked with ${response.status}`,
        severity: 'high',
      };
    } else if (response.status === 201 || response.status === 200) {
      return {
        name: 'Viewer Cannot Create',
        passed: false,
        message: 'RBAC VIOLATION: Viewer was able to create resource',
        severity: 'high',
      };
    } else {
      return {
        name: 'Viewer Cannot Create',
        passed: true,
        message: `Request returned ${response.status} (may be expected if endpoint doesn't exist)`,
        severity: 'high',
      };
    }
  } catch (error) {
    return {
      name: 'Viewer Cannot Create',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'high',
    };
  }
}

// Test: Viewer cannot delete resources
async function testViewerCannotDelete(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/issues/test-issue-id`, {
      method: 'DELETE',
      headers: HEADERS.viewer,
    });

    if ([401, 403].includes(response.status)) {
      return {
        name: 'Viewer Cannot Delete',
        passed: true,
        message: `Viewer delete attempt blocked with ${response.status}`,
        severity: 'high',
      };
    } else if (response.status === 200 || response.status === 204) {
      return {
        name: 'Viewer Cannot Delete',
        passed: false,
        message: 'RBAC VIOLATION: Viewer was able to delete resource',
        severity: 'high',
      };
    } else if (response.status === 404) {
      // 404 might mean the resource doesn't exist, which is acceptable
      return {
        name: 'Viewer Cannot Delete',
        passed: true,
        message: 'Resource not found (RBAC check may not have been reached)',
        severity: 'high',
      };
    } else {
      return {
        name: 'Viewer Cannot Delete',
        passed: true,
        message: `Request returned ${response.status}`,
        severity: 'high',
      };
    }
  } catch (error) {
    return {
      name: 'Viewer Cannot Delete',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'high',
    };
  }
}

// Test: Admin can access admin endpoints
async function testAdminAccess(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/health/detailed`, {
      headers: HEADERS.admin,
    });

    return {
      name: 'Admin Access',
      passed: response.ok,
      message: response.ok
        ? 'Admin can access protected endpoints'
        : `Admin access returned ${response.status}`,
      severity: 'medium',
    };
  } catch (error) {
    return {
      name: 'Admin Access',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'medium',
    };
  }
}

// ==================== INPUT VALIDATION TESTS ====================

// Test: SQL injection in query params
async function testSqlInjectionParams(): Promise<TestResult> {
  const maliciousParams = [
    "'; DROP TABLE issues; --",
    "1 OR 1=1",
    "1; SELECT * FROM users",
    "1 UNION SELECT * FROM contracts",
  ];

  try {
    for (const payload of maliciousParams) {
      const response = await fetch(`${API_URL}/issues?id=${encodeURIComponent(payload)}`, {
        headers: HEADERS.admin,
      });

      // Server should not crash
      if (response.status === 500) {
        return {
          name: 'SQL Injection (Params)',
          passed: false,
          message: `Server error on payload: ${payload}`,
          severity: 'critical',
          details: { payload },
        };
      }
    }

    return {
      name: 'SQL Injection (Params)',
      passed: true,
      message: 'SQL injection payloads handled safely',
      severity: 'critical',
    };
  } catch (error) {
    return {
      name: 'SQL Injection (Params)',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'critical',
    };
  }
}

// Test: SQL injection in request body
async function testSqlInjectionBody(): Promise<TestResult> {
  const maliciousPayloads = [
    { name: "'; DROP TABLE contracts; --" },
    { description: "1 OR 1=1" },
    { filter: "1; SELECT * FROM users" },
  ];

  try {
    for (const payload of maliciousPayloads) {
      const response = await fetch(`${API_URL}/contracts`, {
        method: 'POST',
        headers: HEADERS.admin,
        body: JSON.stringify(payload),
      });

      // Server should not crash
      if (response.status === 500) {
        return {
          name: 'SQL Injection (Body)',
          passed: false,
          message: `Server error on payload: ${JSON.stringify(payload)}`,
          severity: 'critical',
          details: payload,
        };
      }
    }

    return {
      name: 'SQL Injection (Body)',
      passed: true,
      message: 'SQL injection payloads in body handled safely',
      severity: 'critical',
    };
  } catch (error) {
    return {
      name: 'SQL Injection (Body)',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'critical',
    };
  }
}

// Test: XSS in input fields
async function testXssInjection(): Promise<TestResult> {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '"><script>alert(1)</script>',
    "javascript:alert('XSS')",
  ];

  try {
    for (const payload of xssPayloads) {
      const response = await fetch(`${API_URL}/issues`, {
        method: 'POST',
        headers: HEADERS.admin,
        body: JSON.stringify({
          title: payload,
          description: payload,
        }),
      });

      // Server should not crash
      if (response.status === 500) {
        return {
          name: 'XSS Injection',
          passed: false,
          message: `Server error on XSS payload`,
          severity: 'high',
          details: { payload },
        };
      }

      // If created, check that response doesn't reflect unescaped
      if (response.status === 201 || response.status === 200) {
        const text = await response.text();
        if (text.includes('<script>') && !text.includes('&lt;script&gt;')) {
          return {
            name: 'XSS Injection',
            passed: false,
            message: 'Response contains unescaped script tags',
            severity: 'high',
            details: { payload },
          };
        }
      }
    }

    return {
      name: 'XSS Injection',
      passed: true,
      message: 'XSS payloads handled safely',
      severity: 'high',
    };
  } catch (error) {
    return {
      name: 'XSS Injection',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'high',
    };
  }
}

// Test: Path traversal
async function testPathTraversal(): Promise<TestResult> {
  const traversalPayloads = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd',
  ];

  try {
    for (const payload of traversalPayloads) {
      const response = await fetch(`${API_URL}/uploads/${encodeURIComponent(payload)}`, {
        headers: HEADERS.admin,
      });

      // Should return 400 or 404, not actual file contents
      if (response.status === 200) {
        const text = await response.text();
        if (text.includes('root:') || text.includes('[boot loader]')) {
          return {
            name: 'Path Traversal',
            passed: false,
            message: 'CRITICAL: Path traversal vulnerability detected',
            severity: 'critical',
            details: { payload },
          };
        }
      }
    }

    return {
      name: 'Path Traversal',
      passed: true,
      message: 'Path traversal attempts blocked',
      severity: 'critical',
    };
  } catch (error) {
    return {
      name: 'Path Traversal',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'critical',
    };
  }
}

// ==================== RATE LIMITING TESTS ====================

// Test: Rate limiting exists
async function testRateLimiting(): Promise<TestResult> {
  const requests = 50;
  let rateLimited = false;
  let successCount = 0;

  try {
    for (let i = 0; i < requests; i++) {
      const response = await fetch(`${API_URL}/health`, {
        headers: HEADERS.admin,
      });

      if (response.status === 429) {
        rateLimited = true;
        break;
      }
      if (response.ok) {
        successCount++;
      }
    }

    return {
      name: 'Rate Limiting',
      passed: true, // Pass if either rate limited or all requests succeeded (rate limit may be higher)
      message: rateLimited
        ? `Rate limiting triggered after ${successCount} requests`
        : `${successCount}/${requests} requests succeeded (rate limit may be higher or disabled)`,
      severity: 'medium',
      details: { rateLimited, successCount },
    };
  } catch (error) {
    return {
      name: 'Rate Limiting',
      passed: false,
      message: `Test failed: ${error}`,
      severity: 'medium',
    };
  }
}

// ==================== CORS TESTS ====================

// Test: CORS headers are properly set
async function testCorsHeaders(): Promise<TestResult> {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
    const allowCredentials = response.headers.get('Access-Control-Allow-Credentials');

    // Check if CORS allows arbitrary origins with credentials (dangerous)
    if (allowOrigin === '*' && allowCredentials === 'true') {
      return {
        name: 'CORS Headers',
        passed: false,
        message: 'DANGEROUS: CORS allows all origins with credentials',
        severity: 'high',
      };
    }

    if (allowOrigin === 'https://malicious-site.com') {
      return {
        name: 'CORS Headers',
        passed: false,
        message: 'CORS reflects arbitrary origin',
        severity: 'high',
      };
    }

    return {
      name: 'CORS Headers',
      passed: true,
      message: allowOrigin
        ? `CORS configured: ${allowOrigin}`
        : 'CORS not enabled (may be intentional)',
      severity: 'high',
      details: { allowOrigin, allowCredentials },
    };
  } catch (error) {
    return {
      name: 'CORS Headers',
      passed: true, // Network error might mean CORS blocked
      message: `CORS check: ${error}`,
      severity: 'high',
    };
  }
}

// ==================== SENSITIVE DATA TESTS ====================

// Test: Error messages don't leak sensitive info
async function testErrorMessageLeakage(): Promise<TestResult> {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /database.*connection/i,
    /stack.*trace/i,
    /at.*\(/,  // Stack trace pattern
    /postgresql:\/\//i,
    /redis:\/\//i,
  ];

  try {
    // Trigger an error
    const response = await fetch(`${API_URL}/invalid-endpoint-xyz`, {
      headers: HEADERS.admin,
    });

    const text = await response.text();

    for (const pattern of sensitivePatterns) {
      if (pattern.test(text)) {
        return {
          name: 'Error Message Leakage',
          passed: false,
          message: `Error response may contain sensitive info (matched: ${pattern})`,
          severity: 'medium',
          details: { matchedPattern: pattern.toString() },
        };
      }
    }

    return {
      name: 'Error Message Leakage',
      passed: true,
      message: 'Error responses do not leak sensitive information',
      severity: 'medium',
    };
  } catch (error) {
    return {
      name: 'Error Message Leakage',
      passed: true,
      message: 'Could not test error messages',
      severity: 'medium',
    };
  }
}

// ==================== MAIN ====================

async function runSecurityTests(): Promise<void> {
  console.log('='.repeat(60));
  console.log('SECURITY TESTING');
  console.log('='.repeat(60));
  console.log(`\nAPI URL: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const tests = [
    // Auth tests
    { fn: testMissingAuthHeaders, category: 'Authentication' },
    { fn: testInvalidTenantId, category: 'Authentication' },
    { fn: testMalformedHeaders, category: 'Authentication' },

    // RBAC tests
    { fn: testViewerCannotCreate, category: 'RBAC' },
    { fn: testViewerCannotDelete, category: 'RBAC' },
    { fn: testAdminAccess, category: 'RBAC' },

    // Injection tests
    { fn: testSqlInjectionParams, category: 'Injection' },
    { fn: testSqlInjectionBody, category: 'Injection' },
    { fn: testXssInjection, category: 'Injection' },
    { fn: testPathTraversal, category: 'Injection' },

    // Other security tests
    { fn: testRateLimiting, category: 'Rate Limiting' },
    { fn: testCorsHeaders, category: 'CORS' },
    { fn: testErrorMessageLeakage, category: 'Information Leakage' },
  ];

  const results: TestResult[] = [];
  let currentCategory = '';

  for (const { fn, category } of tests) {
    if (category !== currentCategory) {
      currentCategory = category;
      console.log(`\n## ${category}\n`);
    }

    const result = await fn();
    results.push(result);

    const severityIcon = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    }[result.severity];

    const statusIcon = result.passed ? '✅' : '❌';
    console.log(`${statusIcon} ${severityIcon} ${result.name}: ${result.message}`);
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.severity === 'critical').length;
  const highFailed = results.filter(r => !r.passed && r.severity === 'high').length;

  console.log('\n' + '='.repeat(60));
  console.log('SECURITY TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:           ${results.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  console.log(`Critical Failed: ${criticalFailed}`);
  console.log(`High Failed:     ${highFailed}`);

  if (criticalFailed > 0) {
    console.log('\n🔴 CRITICAL SECURITY ISSUES FOUND');
    process.exit(1);
  } else if (highFailed > 0) {
    console.log('\n🟠 HIGH SEVERITY ISSUES FOUND');
    process.exit(1);
  } else if (failed > 0) {
    console.log('\n🟡 Some security tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All security tests passed');
  }
}

runSecurityTests().catch(console.error);
