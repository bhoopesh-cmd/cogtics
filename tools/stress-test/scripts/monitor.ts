import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { SystemMetrics } from '../config/test-config';

export class SystemMonitor {
  private metricsHistory: SystemMetrics[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  start(intervalMs = 5000): void {
    this.isRunning = true;
    this.metricsHistory = [];

    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        const metrics = this.collectMetrics();
        this.metricsHistory.push(metrics);
        this.logMetrics(metrics);
      }
    }, intervalMs);
  }

  stop(): SystemMetrics[] {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    return this.metricsHistory;
  }

  getMetrics(): SystemMetrics[] {
    return this.metricsHistory;
  }

  collectMetrics(): SystemMetrics {
    return {
      timestamp: Date.now(),
      apiMemoryMB: this.getDockerMemory('api'),
      workerMemoryMB: this.getDockerMemory('worker'),
      postgresConnections: this.getPostgresConnections(),
      redisMemoryMB: this.getRedisMemory(),
      queueDepth: this.getQueueDepth(),
      dbSizeMB: this.getDatabaseSize(),
    };
  }

  private getDockerMemory(serviceName: string): number {
    try {
      const output = execSync(
        `docker stats --no-stream --format "{{.Container}},{{.MemUsage}}" | grep "${serviceName}" | head -1`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      if (!output.trim()) return 0;

      // Parse format: "container_name,123.4MiB / 2GiB"
      const memPart = output.split(',')[1]?.split('/')[0]?.trim();
      if (!memPart) return 0;

      const value = parseFloat(memPart);
      if (memPart.includes('GiB')) return value * 1024;
      if (memPart.includes('MiB')) return value;
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private getPostgresConnections(): number {
    try {
      const output = execSync(
        `psql "postgresql://cogtics:cogtics@localhost:5432/cogtics" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='cogtics';"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      return parseInt(output.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  private getRedisMemory(): number {
    try {
      const output = execSync('redis-cli info memory | grep "used_memory_human"', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      // Parse format: "used_memory_human:1.23M"
      const value = parseFloat(output.split(':')[1] || '0');
      const unit = output.match(/[KMG]/)?.[0];

      if (unit === 'G') return value * 1024;
      if (unit === 'M') return value;
      if (unit === 'K') return value / 1024;
      return 0;
    } catch (error) {
      return 0;
    }
  }

  private getQueueDepth(): number {
    try {
      const output = execSync(
        `redis-cli llen "bull:upload.pdf.parse:wait"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      return parseInt(output.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  private getDatabaseSize(): number {
    try {
      const output = execSync(
        `psql "postgresql://cogtics:cogtics@localhost:5432/cogtics" -t -c "SELECT pg_database_size('cogtics') / 1024 / 1024;"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      return parseFloat(output.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  private logMetrics(metrics: SystemMetrics): void {
    const timestamp = new Date(metrics.timestamp).toISOString();
    console.log(`[${timestamp}] API: ${metrics.apiMemoryMB.toFixed(0)}MB | Worker: ${metrics.workerMemoryMB.toFixed(0)}MB | PG: ${metrics.postgresConnections} conn | Redis: ${metrics.redisMemoryMB.toFixed(0)}MB | Queue: ${metrics.queueDepth} | DB: ${metrics.dbSizeMB.toFixed(0)}MB`);
  }
}

// Standalone monitoring script
const monitor = new SystemMonitor();

console.log('Starting system monitoring... Press Ctrl+C to stop.');
monitor.start(1000); // Collect every 1 second for standalone mode

process.on('SIGINT', () => {
  console.log('\nStopping monitor...');
  const metrics = monitor.stop();

  // Write to CSV
  const csv = [
    'timestamp,apiMemoryMB,workerMemoryMB,postgresConnections,redisMemoryMB,queueDepth,dbSizeMB',
    ...metrics.map(m =>
      `${m.timestamp},${m.apiMemoryMB},${m.workerMemoryMB},${m.postgresConnections},${m.redisMemoryMB},${m.queueDepth},${m.dbSizeMB}`
    ),
  ].join('\n');

  const outputFile = `outputs/metrics-${Date.now()}.csv`;
  writeFileSync(outputFile, csv);
  console.log(`Metrics saved to ${outputFile}`);
  process.exit(0);
});
