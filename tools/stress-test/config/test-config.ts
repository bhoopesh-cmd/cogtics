export interface TestConfig {
  batchSize: number;
  concurrency: number;
  pdfDir: string;
  apiUrl: string;
  tenantId: string;
  userId: string;
  authMode: 'dev' | 'token';
  authToken?: string;
}

export interface SystemMetrics {
  timestamp: number;
  apiMemoryMB: number;
  workerMemoryMB: number;
  postgresConnections: number;
  redisMemoryMB: number;
  queueDepth: number;
  dbSizeMB: number;
}

export interface TestResult {
  batchSize: number;
  concurrency: number;
  totalTime: number;
  avgUploadTime: number;
  avgProcessTime: number;
  successCount: number;
  failureCount: number;
  peakQueueDepth: number;
  peakMemoryMB: number;
  errorMessages: string[];
  metrics: SystemMetrics[];
}

export const BATCH_CONFIGS = [
  { name: 'small', count: 50, concurrent: 5 },
  { name: 'medium', count: 100, concurrent: 10 },
  { name: 'large', count: 500, concurrent: 25 },
  { name: 'xlarge', count: 1000, concurrent: 50 },
  { name: 'stress', count: 2400, concurrent: 100 },
];

export const DEFAULT_CONFIG: Partial<TestConfig> = {
  pdfDir: '../synthetic-data/output/stress_test/pdfs',
  apiUrl: 'http://localhost:3000',
  tenantId: 'tenant_01',
  userId: 'user_01',
  authMode: 'dev',
};

export const THRESHOLDS = {
  presignedUrlMs: 500,
  s3UploadSeconds: 5,
  jobEnqueueMs: 200,
  jobProcessSeconds: 10,
  endToEndSeconds: 30,
  apiMemoryMB: 1024,
  workerMemoryMB: 2048,
  postgresConnectionPercent: 80,
  redisMemoryMB: 512,
  queueDepth: 1000,
  errorRatePercent: 5,
};
