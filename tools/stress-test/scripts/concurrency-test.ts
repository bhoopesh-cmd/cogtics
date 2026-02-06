import { writeFileSync } from 'fs';
import pLimit from 'p-limit';
import { generateTestUsers, type UserConfig } from '../lib/jwt-generator.js';
import { DockerMetricsCollector, type SystemMetrics } from '../lib/metrics-collector.js';
import { UserSimulator, type UserResult } from './user-simulator.js';
import {
  CONCURRENCY_SCENARIOS,
  DEFAULT_CONCURRENCY_CONFIG,
  THRESHOLDS,
  type ConcurrencyTestConfig,
} from '../config/concurrency-config.js';

export interface ConcurrencyTestResult {
  scenario: string;
  config: ConcurrencyTestConfig;
  startTime: number;
  endTime: number;
  totalUsers: number;
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  userResults: UserResult[];
  systemMetrics: SystemMetrics[];
  peakConcurrency: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorBreakdown: Record<string, number>;
  thresholds: {
    successRate: { value: number; pass: boolean };
    p95ResponseTime: { value: number; pass: boolean };
    errorRate: { value: number; pass: boolean };
  };
}

/**
 * Main concurrency test runner
 */
export class ConcurrencyTest {
  private config: ConcurrencyTestConfig;
  private metricsCollector: DockerMetricsCollector;
  private systemMetrics: SystemMetrics[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private apiUrl: string;

  constructor(config: ConcurrencyTestConfig, apiUrl = 'http://localhost:3000') {
    this.config = { ...DEFAULT_CONCURRENCY_CONFIG, ...config } as ConcurrencyTestConfig;
    this.metricsCollector = new DockerMetricsCollector();
    this.apiUrl = apiUrl;
  }

  /**
   * Run the concurrency test
   */
  async run(scenarioName: string): Promise<ConcurrencyTestResult> {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 2: CONCURRENCY TEST                                       ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║  Scenario: ${scenarioName.padEnd(55)}║`);
    console.log(`║  Users: ${this.config.userCount.toString().padEnd(58)}║`);
    console.log(`║  PDFs/User: ${this.config.pdfsPerUser.toString().padEnd(54)}║`);
    console.log(`║  Total PDFs: ${(this.config.userCount * this.config.pdfsPerUser).toString().padEnd(53)}║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Start system monitoring
    this.startMonitoring();

    // Generate test users
    console.log(`Generating ${this.config.userCount} test users...`);
    const users = await generateTestUsers(
      this.config.userCount,
      this.config.tenants[0],
      {
        uploadCount: this.config.pdfsPerUser,
        delayBetweenUploads: this.config.delayBetweenUploads,
      }
    );

    console.log(`Starting concurrent user simulations...\n`);

    // Spawn users concurrently
    const userResults = await this.spawnUsers(users);

    const endTime = Date.now();

    // Stop monitoring
    this.stopMonitoring();

    // Calculate results
    const result = this.calculateResults(scenarioName, startTime, endTime, userResults);

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST COMPLETE                                                   ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Time: ${((endTime - startTime) / 1000).toFixed(1)}s`.padEnd(67) + '║');
    console.log(`║  Success: ${result.successfulUploads} | Failed: ${result.failedUploads}`.padEnd(67) + '║');
    console.log(`║  Success Rate: ${result.thresholds.successRate.value.toFixed(1)}% ${result.thresholds.successRate.pass ? '✓' : '✗'}`.padEnd(67) + '║');
    console.log(`║  p95 Response: ${(result.p95ResponseTime / 1000).toFixed(1)}s ${result.thresholds.p95ResponseTime.pass ? '✓' : '✗'}`.padEnd(67) + '║');
    console.log(`║  Error Rate: ${result.thresholds.errorRate.value.toFixed(1)}% ${result.thresholds.errorRate.pass ? '✓' : '✗'}`.padEnd(67) + '║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    return result;
  }

  /**
   * Spawn users with staggered starts
   */
  private async spawnUsers(users: UserConfig[]): Promise<UserResult[]> {
    const results: UserResult[] = [];
    const limit = pLimit(this.config.userCount); // Allow all users to run concurrently

    const promises = users.map((user, index) =>
      limit(async () => {
        // Stagger user starts
        await new Promise(resolve => setTimeout(resolve, index * this.config.delayBetweenUsers));

        const simulator = new UserSimulator(user, this.apiUrl, this.config.pdfDir);
        return simulator.run();
      })
    );

    return Promise.all(promises);
  }

  /**
   * Start collecting system metrics
   */
  private startMonitoring(): void {
    this.systemMetrics = [];
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.metricsCollector.collectMetrics();
        this.systemMetrics.push(metrics);

        // Log current status
        const queueTotal = Object.values(metrics.redis.queueDepths).reduce((a, b) => a + b, 0);
        console.log(
          `[METRICS] PG: ${metrics.postgres.activeConnections}/${metrics.postgres.maxConnections} conn | ` +
          `Queue: ${queueTotal} | ` +
          `Worker: ${metrics.containers.worker.memoryMB.toFixed(0)}MB`
        );
      } catch (error) {
        // Ignore metrics collection errors
      }
    }, 5000); // Collect every 5 seconds
  }

  /**
   * Stop collecting system metrics
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * Calculate final test results
   */
  private calculateResults(
    scenarioName: string,
    startTime: number,
    endTime: number,
    userResults: UserResult[]
  ): ConcurrencyTestResult {
    const totalUploads = userResults.reduce((sum, u) => sum + u.uploads.length, 0);
    const successfulUploads = userResults.reduce(
      (sum, u) => sum + u.uploads.filter(upload => upload.success).length,
      0
    );
    const failedUploads = totalUploads - successfulUploads;

    // Collect all response times
    const allUploadTimes: number[] = [];
    const allProcessTimes: number[] = [];
    userResults.forEach(user => {
      user.uploads.forEach(upload => {
        if (upload.success) {
          allUploadTimes.push(upload.uploadTimeMs);
          allProcessTimes.push(upload.processTimeMs);
        }
      });
    });

    const allResponseTimes = allUploadTimes.map((u, i) => u + allProcessTimes[i]);

    // Calculate percentiles
    const sorted = allResponseTimes.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length || 0;

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    userResults.forEach(user => {
      user.errors.forEach(error => {
        errorBreakdown[error] = (errorBreakdown[error] || 0) + 1;
      });
    });

    // Calculate peak concurrency (approximation based on overlapping user sessions)
    const peakConcurrency = Math.min(this.config.userCount, 50); // Rough estimate

    // Success metrics
    const successRate = (successfulUploads / totalUploads) * 100;
    const errorRate = (failedUploads / totalUploads) * 100;

    return {
      scenario: scenarioName,
      config: this.config,
      startTime,
      endTime,
      totalUsers: userResults.length,
      totalUploads,
      successfulUploads,
      failedUploads,
      userResults,
      systemMetrics: this.systemMetrics,
      peakConcurrency,
      avgResponseTime: avg,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      errorBreakdown,
      thresholds: {
        successRate: {
          value: successRate,
          pass: successRate >= THRESHOLDS.successRate.target,
        },
        p95ResponseTime: {
          value: p95,
          pass: p95 <= THRESHOLDS.responseTime.p95Target,
        },
        errorRate: {
          value: errorRate,
          pass: errorRate <= THRESHOLDS.errorRate.target,
        },
      },
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const scenarioArg = args.find(a => a.startsWith('--scenario='))?.split('=')[1];
  const usersArg = args.find(a => a.startsWith('--users='))?.split('=')[1];
  const pdfsArg = args.find(a => a.startsWith('--pdfs='))?.split('=')[1];

  let config: ConcurrencyTestConfig;
  let scenarioName: string;

  if (scenarioArg) {
    // Use predefined scenario
    const scenario = CONCURRENCY_SCENARIOS.find(s => s.name === scenarioArg);
    if (!scenario) {
      console.error(`Unknown scenario: ${scenarioArg}`);
      console.error(`Available scenarios: ${CONCURRENCY_SCENARIOS.map(s => s.name).join(', ')}`);
      process.exit(1);
    }
    config = scenario.config;
    scenarioName = scenario.name;
  } else if (usersArg && pdfsArg) {
    // Custom configuration
    config = {
      ...DEFAULT_CONCURRENCY_CONFIG,
      userCount: parseInt(usersArg),
      pdfsPerUser: parseInt(pdfsArg),
    } as ConcurrencyTestConfig;
    scenarioName = `custom_${usersArg}users_${pdfsArg}pdfs`;
  } else {
    console.error('Usage: tsx scripts/concurrency-test.ts --scenario=<name> OR --users=<N> --pdfs=<N>');
    console.error(`Available scenarios: ${CONCURRENCY_SCENARIOS.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  const test = new ConcurrencyTest(config);
  const result = await test.run(scenarioName);

  // Save results
  const outputFile = `results/concurrency-${scenarioName}-${Date.now()}.json`;
  writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`Results saved to ${outputFile}`);
}

// Run if executed directly
main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
