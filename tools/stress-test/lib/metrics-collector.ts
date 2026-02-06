import { execSync } from 'child_process';

export interface PostgresStats {
  activeConnections: number;
  idleConnections: number;
  waitingQueries: number;
  maxConnections: number;
}

export interface RedisStats {
  connectedClients: number;
  usedMemoryMB: number;
  totalCommands: number;
  queueDepths: Record<string, number>;
}

export interface ContainerStats {
  api: { cpuPercent: number; memoryMB: number };
  worker: { cpuPercent: number; memoryMB: number };
  postgres: { cpuPercent: number; memoryMB: number };
  redis: { cpuPercent: number; memoryMB: number };
}

export interface SystemMetrics {
  timestamp: number;
  postgres: PostgresStats;
  redis: RedisStats;
  containers: ContainerStats;
}

/**
 * Docker-based metrics collector (fixes Phase 1 Windows CLI limitations)
 * Uses docker exec to run commands inside containers
 */
export class DockerMetricsCollector {
  /**
   * Get PostgreSQL connection stats via Docker exec
   */
  async getPostgresStats(): Promise<PostgresStats> {
    try {
      const cmd = `docker exec cogtics-postgres psql -U cogtics -d cogtics -t -c "SELECT json_build_object('active', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'), 'idle', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'), 'waiting', (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL), 'max', (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'))"`;

      const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const data = JSON.parse(output.trim());

      return {
        activeConnections: data.active || 0,
        idleConnections: data.idle || 0,
        waitingQueries: data.waiting || 0,
        maxConnections: data.max || 100,
      };
    } catch (error) {
      return {
        activeConnections: 0,
        idleConnections: 0,
        waitingQueries: 0,
        maxConnections: 100,
      };
    }
  }

  /**
   * Get Redis stats via Docker exec
   */
  async getRedisStats(): Promise<RedisStats> {
    try {
      // Get basic stats
      const infoCmd = `docker exec cogtics-redis redis-cli info memory`;
      const infoOutput = execSync(infoCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

      // Parse memory usage
      const memMatch = infoOutput.match(/used_memory_human:([0-9.]+)([KMG])/);
      let memoryMB = 0;
      if (memMatch) {
        const value = parseFloat(memMatch[1]);
        const unit = memMatch[2];
        if (unit === 'G') memoryMB = value * 1024;
        else if (unit === 'M') memoryMB = value;
        else if (unit === 'K') memoryMB = value / 1024;
      }

      // Get queue depths
      const queueDepths: Record<string, number> = {};
      const queues = [
        'upload.pdf.parse',
        'contracts.pdf.extract',
        'contracts.clause.segment',
        'contracts.terms.extract',
      ];

      for (const queue of queues) {
        try {
          const queueCmd = `docker exec cogtics-redis redis-cli llen "bull:${queue}:wait"`;
          const queueOutput = execSync(queueCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
          queueDepths[queue] = parseInt(queueOutput.trim()) || 0;
        } catch {
          queueDepths[queue] = 0;
        }
      }

      // Get connected clients
      const clientsCmd = `docker exec cogtics-redis redis-cli info clients`;
      const clientsOutput = execSync(clientsCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const clientsMatch = clientsOutput.match(/connected_clients:([0-9]+)/);
      const connectedClients = clientsMatch ? parseInt(clientsMatch[1]) : 0;

      return {
        connectedClients,
        usedMemoryMB: memoryMB,
        totalCommands: 0, // Not easily available
        queueDepths,
      };
    } catch (error) {
      return {
        connectedClients: 0,
        usedMemoryMB: 0,
        totalCommands: 0,
        queueDepths: {},
      };
    }
  }

  /**
   * Get container resource usage via docker stats
   */
  async getContainerStats(): Promise<ContainerStats> {
    try {
      const cmd = `docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}" cogtics-api cogtics-worker cogtics-postgres cogtics-redis`;
      const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

      const stats: any = {
        api: { cpuPercent: 0, memoryMB: 0 },
        worker: { cpuPercent: 0, memoryMB: 0 },
        postgres: { cpuPercent: 0, memoryMB: 0 },
        redis: { cpuPercent: 0, memoryMB: 0 },
      };

      const lines = output.trim().split('\n');
      for (const line of lines) {
        const [name, cpu, mem] = line.split(',');

        const cpuPercent = parseFloat(cpu.replace('%', '')) || 0;

        // Parse memory (format: "123.4MiB / 2GiB")
        const memPart = mem.split('/')[0]?.trim();
        let memoryMB = 0;
        if (memPart) {
          const value = parseFloat(memPart);
          if (memPart.includes('GiB')) memoryMB = value * 1024;
          else if (memPart.includes('MiB')) memoryMB = value;
        }

        if (name.includes('api')) {
          stats.api = { cpuPercent, memoryMB };
        } else if (name.includes('worker')) {
          stats.worker = { cpuPercent, memoryMB };
        } else if (name.includes('postgres')) {
          stats.postgres = { cpuPercent, memoryMB };
        } else if (name.includes('redis')) {
          stats.redis = { cpuPercent, memoryMB };
        }
      }

      return stats;
    } catch (error) {
      return {
        api: { cpuPercent: 0, memoryMB: 0 },
        worker: { cpuPercent: 0, memoryMB: 0 },
        postgres: { cpuPercent: 0, memoryMB: 0 },
        redis: { cpuPercent: 0, memoryMB: 0 },
      };
    }
  }

  /**
   * Collect all metrics in one call
   */
  async collectMetrics(): Promise<SystemMetrics> {
    const [postgres, redis, containers] = await Promise.all([
      this.getPostgresStats(),
      this.getRedisStats(),
      this.getContainerStats(),
    ]);

    return {
      timestamp: Date.now(),
      postgres,
      redis,
      containers,
    };
  }
}
