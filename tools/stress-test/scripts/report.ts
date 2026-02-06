import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { TestResult, THRESHOLDS } from '../config/test-config';

export class ReportGenerator {
  generateMarkdownReport(results: TestResult[]): string {
    const lines: string[] = [];

    lines.push('# Volume Test Report\n');
    lines.push(`Generated: ${new Date().toISOString()}\n`);
    lines.push('---\n');

    // Summary table
    lines.push('## Test Summary\n');
    lines.push('| Batch | Concurrency | Total Time | Success | Failed | Avg Upload | Avg Process | Peak Queue | Peak Memory |');
    lines.push('|-------|-------------|------------|---------|--------|------------|-------------|------------|-------------|');

    for (const result of results) {
      lines.push(
        `| ${result.batchSize} | ${result.concurrency} | ${(result.totalTime / 1000).toFixed(1)}s | ${result.successCount} | ${result.failureCount} | ${result.avgUploadTime.toFixed(0)}ms | ${result.avgProcessTime.toFixed(0)}ms | ${result.peakQueueDepth} | ${result.peakMemoryMB.toFixed(0)}MB |`
      );
    }

    lines.push('\n---\n');

    // Detailed results
    lines.push('## Detailed Results\n');

    for (const result of results) {
      lines.push(`### Batch: ${result.batchSize}, Concurrency: ${result.concurrency}\n`);

      // Performance metrics
      lines.push('**Performance Metrics**\n');
      lines.push(`- Total Time: ${(result.totalTime / 1000).toFixed(2)}s`);
      lines.push(`- Throughput: ${(result.successCount / (result.totalTime / 1000)).toFixed(2)} PDFs/sec`);
      lines.push(`- Success Rate: ${((result.successCount / result.batchSize) * 100).toFixed(1)}%`);
      lines.push(`- Average Upload Time: ${result.avgUploadTime.toFixed(0)}ms`);
      lines.push(`- Average Process Time: ${result.avgProcessTime.toFixed(0)}ms\n`);

      // System metrics
      lines.push('**System Metrics**\n');
      lines.push(`- Peak Queue Depth: ${result.peakQueueDepth}`);
      lines.push(`- Peak Memory Usage: ${result.peakMemoryMB.toFixed(0)}MB\n`);

      // Threshold analysis
      lines.push('**Threshold Analysis**\n');
      const thresholdChecks = this.analyzeThresholds(result);
      for (const check of thresholdChecks) {
        const icon = check.passed ? '✓' : '✗';
        lines.push(`${icon} ${check.metric}: ${check.value} (threshold: ${check.threshold})`);
      }
      lines.push('');

      // Errors
      if (result.errorMessages.length > 0) {
        lines.push('**Errors**\n');
        const uniqueErrors = [...new Set(result.errorMessages)];
        for (const error of uniqueErrors.slice(0, 10)) {
          lines.push(`- ${error}`);
        }
        if (uniqueErrors.length > 10) {
          lines.push(`- ... and ${uniqueErrors.length - 10} more\n`);
        }
      }

      lines.push('\n---\n');
    }

    // Breaking points
    lines.push('## Breaking Points Analysis\n');
    const breakingPoints = this.analyzeBreakingPoints(results);
    for (const point of breakingPoints) {
      lines.push(`- **${point.metric}**: First exceeded at batch size ${point.batchSize} (value: ${point.value})`);
    }

    return lines.join('\n');
  }

  generateCsvTimeseries(results: TestResult[]): string {
    const lines: string[] = [];

    lines.push('testId,batchSize,concurrency,timestamp,apiMemoryMB,workerMemoryMB,postgresConnections,redisMemoryMB,queueDepth,dbSizeMB');

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const testId = `test_${i + 1}`;

      for (const metric of result.metrics) {
        lines.push(
          `${testId},${result.batchSize},${result.concurrency},${metric.timestamp},${metric.apiMemoryMB},${metric.workerMemoryMB},${metric.postgresConnections},${metric.redisMemoryMB},${metric.queueDepth},${metric.dbSizeMB}`
        );
      }
    }

    return lines.join('\n');
  }

  private analyzeThresholds(result: TestResult): Array<{
    metric: string;
    value: string;
    threshold: string;
    passed: boolean;
  }> {
    return [
      {
        metric: 'Average Upload Time',
        value: `${result.avgUploadTime.toFixed(0)}ms`,
        threshold: `<${THRESHOLDS.endToEndSeconds * 1000}ms`,
        passed: result.avgUploadTime < THRESHOLDS.endToEndSeconds * 1000,
      },
      {
        metric: 'Peak Queue Depth',
        value: `${result.peakQueueDepth}`,
        threshold: `<${THRESHOLDS.queueDepth}`,
        passed: result.peakQueueDepth < THRESHOLDS.queueDepth,
      },
      {
        metric: 'Peak Memory',
        value: `${result.peakMemoryMB.toFixed(0)}MB`,
        threshold: `<${THRESHOLDS.workerMemoryMB}MB`,
        passed: result.peakMemoryMB < THRESHOLDS.workerMemoryMB,
      },
      {
        metric: 'Error Rate',
        value: `${((result.failureCount / result.batchSize) * 100).toFixed(1)}%`,
        threshold: `<${THRESHOLDS.errorRatePercent}%`,
        passed: (result.failureCount / result.batchSize) * 100 < THRESHOLDS.errorRatePercent,
      },
    ];
  }

  private analyzeBreakingPoints(results: TestResult[]): Array<{
    metric: string;
    batchSize: number;
    value: string;
  }> {
    const breakingPoints: Array<{ metric: string; batchSize: number; value: string }> = [];

    // Find first time each threshold was exceeded
    const thresholds = [
      { key: 'queueDepth', limit: THRESHOLDS.queueDepth, getValue: (r: TestResult) => r.peakQueueDepth },
      { key: 'memory', limit: THRESHOLDS.workerMemoryMB, getValue: (r: TestResult) => r.peakMemoryMB },
      { key: 'errorRate', limit: THRESHOLDS.errorRatePercent, getValue: (r: TestResult) => (r.failureCount / r.batchSize) * 100 },
    ];

    for (const threshold of thresholds) {
      const exceeded = results.find(r => threshold.getValue(r) > threshold.limit);
      if (exceeded) {
        breakingPoints.push({
          metric: threshold.key,
          batchSize: exceeded.batchSize,
          value: threshold.getValue(exceeded).toFixed(1),
        });
      }
    }

    return breakingPoints;
  }

  saveReport(results: TestResult[], outputDir: string): void {
    const timestamp = Date.now();

    // Save JSON
    const jsonFile = join(outputDir, `volume-test-${timestamp}.json`);
    writeFileSync(jsonFile, JSON.stringify(results, null, 2));
    console.log(`\nJSON report saved to: ${jsonFile}`);

    // Save Markdown
    const markdown = this.generateMarkdownReport(results);
    const mdFile = join(outputDir, `volume-test-${timestamp}.md`);
    writeFileSync(mdFile, markdown);
    console.log(`Markdown report saved to: ${mdFile}`);

    // Save CSV timeseries
    const csv = this.generateCsvTimeseries(results);
    const csvFile = join(outputDir, `volume-test-${timestamp}.csv`);
    writeFileSync(csvFile, csv);
    console.log(`CSV timeseries saved to: ${csvFile}\n`);
  }

  loadResults(resultsDir: string): TestResult[] {
    const files = readdirSync(resultsDir)
      .filter(f => f.startsWith('volume-') && f.endsWith('.json'))
      .map(f => join(resultsDir, f));

    return files.map(f => JSON.parse(readFileSync(f, 'utf-8')));
  }
}

// CLI interface
async function main() {
  const generator = new ReportGenerator();
  const resultsDir = 'tools/stress-test/results';
  const outputDir = 'tools/stress-test/outputs';

  console.log('Loading test results...');
  const results = generator.loadResults(resultsDir);

  if (results.length === 0) {
    console.log('No test results found. Run volume tests first.');
    process.exit(1);
  }

  console.log(`Found ${results.length} test result(s)`);
  generator.saveReport(results, outputDir);
}

// Run main
main().catch(error => {
  console.error('Report generation failed:', error);
  process.exit(1);
});
