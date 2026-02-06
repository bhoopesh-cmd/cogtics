export interface ConcurrencyTestConfig {
  userCount: number;
  pdfsPerUser: number;
  delayBetweenUsers: number; // ms - stagger user starts
  delayBetweenUploads: number; // ms - delay between a user's uploads
  tenants: string[];
  timeout: number; // ms
  pdfDir: string;
}

export interface TestScenario {
  name: string;
  config: ConcurrencyTestConfig;
  description: string;
}

export const DEFAULT_CONCURRENCY_CONFIG: Partial<ConcurrencyTestConfig> = {
  delayBetweenUsers: 50, // Start users 50ms apart
  delayBetweenUploads: 100, // Users wait 100ms between uploads
  tenants: ['tenant_01'],
  timeout: 600000, // 10 minutes
  pdfDir: '../synthetic-data/output/stress_test/pdfs',
};

export const CONCURRENCY_SCENARIOS: TestScenario[] = [
  {
    name: 'light',
    description: 'Light load - validate test infrastructure',
    config: {
      userCount: 5,
      pdfsPerUser: 10,
      delayBetweenUsers: 100,
      delayBetweenUploads: 100,
      tenants: ['tenant_01'],
      timeout: 600000,
      pdfDir: '../synthetic-data/output/stress_test/pdfs',
    },
  },
  {
    name: 'medium',
    description: 'Medium load - baseline concurrent performance',
    config: {
      userCount: 10,
      pdfsPerUser: 10,
      delayBetweenUsers: 50,
      delayBetweenUploads: 100,
      tenants: ['tenant_01'],
      timeout: 600000,
      pdfDir: '../synthetic-data/output/stress_test/pdfs',
    },
  },
  {
    name: 'heavy',
    description: 'Heavy load - find performance degradation',
    config: {
      userCount: 25,
      pdfsPerUser: 10,
      delayBetweenUsers: 50,
      delayBetweenUploads: 100,
      tenants: ['tenant_01'],
      timeout: 900000,
      pdfDir: '../synthetic-data/output/stress_test/pdfs',
    },
  },
  {
    name: 'stress',
    description: 'Stress test - find breaking point',
    config: {
      userCount: 50,
      pdfsPerUser: 10,
      delayBetweenUsers: 20,
      delayBetweenUploads: 100,
      tenants: ['tenant_01'],
      timeout: 1200000,
      pdfDir: '../synthetic-data/output/stress_test/pdfs',
    },
  },
  {
    name: 'extreme',
    description: 'Extreme load - system limits',
    config: {
      userCount: 100,
      pdfsPerUser: 5,
      delayBetweenUsers: 10,
      delayBetweenUploads: 100,
      tenants: ['tenant_01'],
      timeout: 1800000,
      pdfDir: '../synthetic-data/output/stress_test/pdfs',
    },
  },
];

export const MULTI_TENANT_SCENARIOS: TestScenario[] = [
  {
    name: 'multi_tenant_basic',
    description: 'Basic multi-tenant - 3 tenants, 5 users each',
    config: {
      userCount: 5,
      pdfsPerUser: 10,
      delayBetweenUsers: 50,
      delayBetweenUploads: 100,
      tenants: ['tenant_01', 'tenant_02', 'tenant_03'],
      timeout: 900000,
      pdfDir: '../synthetic-data/output/stress_test/pdfs',
    },
  },
  {
    name: 'multi_tenant_extended',
    description: 'Extended multi-tenant - 5 tenants, 10 users each',
    config: {
      userCount: 10,
      pdfsPerUser: 10,
      delayBetweenUsers: 30,
      delayBetweenUploads: 100,
      tenants: ['tenant_01', 'tenant_02', 'tenant_03', 'tenant_04', 'tenant_05'],
      timeout: 1200000,
      pdfDir: '../synthetic-data/output/stress_test/pdfs',
    },
  },
];

export const THRESHOLDS = {
  successRate: {
    target: 95, // %
    warning: 90,
    failure: 80,
  },
  responseTime: {
    p95Target: 5000, // ms
    p95Warning: 10000,
    p95Failure: 30000,
  },
  errorRate: {
    target: 2, // %
    warning: 5,
    failure: 10,
  },
  queueRecovery: {
    target: 300000, // 5 minutes in ms
    warning: 900000, // 15 minutes
  },
  memoryGrowth: {
    target: 20, // % increase
    warning: 50,
  },
};
