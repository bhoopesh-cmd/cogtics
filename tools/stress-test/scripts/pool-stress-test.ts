import { DockerMetricsCollector } from '../lib/metrics-collector.js';
import { ApiClient } from '../lib/api-client.js';

/**
 * Connection pool stress test
 * Attempts to exhaust database connection pool
 */
async function main() {
  const args = process.argv.slice(2);
  const connections = parseInt(args.find(a => a.startsWith('--connections='))?.split('=')[1] || '100');

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2: CONNECTION POOL STRESS TEST                            ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Target Connections: ${connections}`.padEnd(67) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const apiUrl = 'http://localhost:3000';
  const metricsCollector = new DockerMetricsCollector();

  // Get baseline
  const baseline = await metricsCollector.getPostgresStats();
  console.log(`Baseline connections: ${baseline.activeConnections}/${baseline.maxConnections}`);

  console.log(`\nCreating ${connections} concurrent requests...`);

  // Create many concurrent long-running requests
  const requests = [];
  for (let i = 0; i < connections; i++) {
    const client = new ApiClient({
      baseUrl: apiUrl,
      userId: 'user_01',
      tenantId: 'tenant_01',
    });

    requests.push(
      client.listUploads(50).catch(error => ({
        error: error.message,
        index: i,
      }))
    );
  }

  // Monitor connection pool while requests are in flight
  const monitorInterval = setInterval(async () => {
    const stats = await metricsCollector.getPostgresStats();
    console.log(
      `Connections: ${stats.activeConnections}/${stats.maxConnections} active, ` +
      `${stats.idleConnections} idle, ${stats.waitingQueries} waiting`
    );
  }, 1000);

  const results = await Promise.allSettled(requests);
  clearInterval(monitorInterval);

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  TEST COMPLETE                                                   ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Successful: ${successful}/${connections}`.padEnd(67) + '║');
  console.log(`║  Failed: ${failed}/${connections}`.padEnd(67) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Get final stats
  const final = await metricsCollector.getPostgresStats();
  console.log(`Final connections: ${final.activeConnections}/${final.maxConnections}`);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
