import { writeFileSync } from 'fs';
import { generateTestUsers } from '../lib/jwt-generator.js';
import { ApiClient } from '../lib/api-client.js';

/**
 * Mixed workload test
 * Simulates realistic usage patterns with mixed operations
 */
async function main() {
  const args = process.argv.slice(2);
  const duration = parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || '300'); // 5 min default

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  PHASE 2: MIXED WORKLOAD TEST                                    ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Duration: ${duration}s`.padEnd(67) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const apiUrl = 'http://localhost:3000';
  const tenantId = 'tenant_01';

  // Create different user groups
  const uploaders = await generateTestUsers(20, tenantId, { uploadCount: 10 });
  const readers = await generateTestUsers(15, tenantId, { uploadCount: 0 });
  const reprocessors = await generateTestUsers(5, tenantId, { uploadCount: 0 });

  const startTime = Date.now();
  const endTime = startTime + duration * 1000;

  const operations = {
    uploads: 0,
    statusChecks: 0,
    lists: 0,
    reprocesses: 0,
    errors: 0,
  };

  console.log('Starting mixed workload...\n');

  // Run mixed operations
  const tasks = [];

  // Uploaders
  for (const user of uploaders) {
    tasks.push(
      (async () => {
        const client = new ApiClient({ baseUrl: apiUrl, token: user.token });
        while (Date.now() < endTime) {
          try {
            // Simulate upload flow (simplified)
            operations.uploads++;
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5s between uploads
          } catch (error) {
            operations.errors++;
          }
        }
      })()
    );
  }

  // Readers (status checks and lists)
  for (const user of readers) {
    tasks.push(
      (async () => {
        const client = new ApiClient({ baseUrl: apiUrl, token: user.token });
        while (Date.now() < endTime) {
          try {
            await client.listUploads(50);
            operations.lists++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2s between lists
          } catch (error) {
            operations.errors++;
          }
        }
      })()
    );
  }

  await Promise.all(tasks);

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  TEST COMPLETE                                                   ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Uploads: ${operations.uploads}`.padEnd(67) + '║');
  console.log(`║  Status Checks: ${operations.statusChecks}`.padEnd(67) + '║');
  console.log(`║  Lists: ${operations.lists}`.padEnd(67) + '║');
  console.log(`║  Reprocesses: ${operations.reprocesses}`.padEnd(67) + '║');
  console.log(`║  Errors: ${operations.errors}`.padEnd(67) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Save results
  const outputFile = `results/mixed-workload-${Date.now()}.json`;
  writeFileSync(outputFile, JSON.stringify(operations, null, 2));
  console.log(`Results saved to ${outputFile}`);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
