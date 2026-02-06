import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

class SetupVerifier {
  private results: CheckResult[] = [];

  async verify(): Promise<boolean> {
    console.log('=== Verifying Stress Test Setup ===\n');

    this.checkDocker();
    this.checkPostgres();
    this.checkRedis();
    this.checkMinio();
    this.checkApi();
    this.checkPdfData();

    console.log('\n=== Verification Results ===\n');

    let allPassed = true;

    for (const result of this.results) {
      const icon = result.status === 'pass' ? '✓' : result.status === 'warn' ? '⚠' : '✗';
      const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'warn' ? '\x1b[33m' : '\x1b[31m';
      console.log(`${color}${icon}\x1b[0m ${result.name}: ${result.message}`);

      if (result.status === 'fail') {
        allPassed = false;
      }
    }

    console.log('');

    if (allPassed) {
      console.log('\x1b[32m✓ All checks passed! Ready to run stress tests.\x1b[0m\n');
    } else {
      console.log('\x1b[31m✗ Some checks failed. Please fix the issues above before running tests.\x1b[0m\n');
    }

    return allPassed;
  }

  private checkDocker(): void {
    try {
      execSync('docker ps', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      this.results.push({
        name: 'Docker',
        status: 'pass',
        message: 'Docker is running',
      });
    } catch (error) {
      this.results.push({
        name: 'Docker',
        status: 'fail',
        message: 'Docker is not running or not installed',
      });
    }
  }

  private checkPostgres(): void {
    try {
      const output = execSync(
        'psql "postgresql://cogtics:cogtics@localhost:5432/cogtics" -t -c "SELECT 1;"',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      if (output.trim() === '1') {
        this.results.push({
          name: 'PostgreSQL',
          status: 'pass',
          message: 'Connected successfully',
        });
      } else {
        this.results.push({
          name: 'PostgreSQL',
          status: 'fail',
          message: 'Connection failed',
        });
      }
    } catch (error) {
      this.results.push({
        name: 'PostgreSQL',
        status: 'fail',
        message: 'Cannot connect (check if container is running)',
      });
    }
  }

  private checkRedis(): void {
    try {
      const output = execSync('redis-cli ping', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      if (output.trim() === 'PONG') {
        this.results.push({
          name: 'Redis',
          status: 'pass',
          message: 'Connected successfully',
        });
      } else {
        this.results.push({
          name: 'Redis',
          status: 'fail',
          message: 'Connection failed',
        });
      }
    } catch (error) {
      this.results.push({
        name: 'Redis',
        status: 'fail',
        message: 'Cannot connect (check if container is running)',
      });
    }
  }

  private checkMinio(): void {
    try {
      execSync('curl -s http://localhost:9000/minio/health/live', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      this.results.push({
        name: 'MinIO',
        status: 'pass',
        message: 'Service is running',
      });
    } catch (error) {
      this.results.push({
        name: 'MinIO',
        status: 'fail',
        message: 'Cannot connect (check if container is running)',
      });
    }
  }

  private checkApi(): void {
    try {
      const response = execSync('curl -s http://localhost:3000/health', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      if (response.includes('ok') || response.includes('healthy')) {
        this.results.push({
          name: 'API',
          status: 'pass',
          message: 'Service is healthy',
        });
      } else {
        this.results.push({
          name: 'API',
          status: 'warn',
          message: 'Service responded but health check unclear',
        });
      }
    } catch (error) {
      this.results.push({
        name: 'API',
        status: 'fail',
        message: 'Cannot connect (check if service is running on port 3000)',
      });
    }
  }

  private checkPdfData(): void {
    const pdfDir = '../synthetic-data/output/stress_test/pdfs';

    if (!existsSync(pdfDir)) {
      this.results.push({
        name: 'PDF Data',
        status: 'fail',
        message: `Directory not found: ${pdfDir}`,
      });
      return;
    }

    const pdfFiles = readdirSync(pdfDir).filter(f => f.endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      this.results.push({
        name: 'PDF Data',
        status: 'fail',
        message: `No PDF files found in ${pdfDir}`,
      });
    } else if (pdfFiles.length < 100) {
      this.results.push({
        name: 'PDF Data',
        status: 'warn',
        message: `Only ${pdfFiles.length} PDFs found (need 2400 for full stress test)`,
      });
    } else {
      this.results.push({
        name: 'PDF Data',
        status: 'pass',
        message: `Found ${pdfFiles.length} PDF files`,
      });
    }
  }
}

// Main
async function main() {
  const verifier = new SetupVerifier();
  const success = await verifier.verify();
  process.exit(success ? 0 : 1);
}

// Run if this is the main module
main();
