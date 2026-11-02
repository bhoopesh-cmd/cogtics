import type { Logger } from 'pino';
import type { Kysely, Database } from '@cogtics/db';
import type { DigestSendJobPayload, JobResult } from '@cogtics/schemas';
import { createDigestRunId } from '@cogtics/schemas';

/**
 * Process digest send job
 */
export async function processDigestSendJob(
  payload: DigestSendJobPayload,
  logger: Logger,
  db: Kysely<Database>
): Promise<JobResult> {
  const { subscriptionId, runId, tenantId } = payload;
  
  logger.info({ subscriptionId, runId }, 'Starting digest send');
  
  const startTime = Date.now();
  
  try {
    // Get subscription details
    const subscription = await db
      .selectFrom('digest_subscriptions')
      .selectAll()
      .where('id', '=', subscriptionId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    
    if (!subscription) {
      throw new Error(`Digest subscription not found: ${subscriptionId}`);
    }
    
    if (!subscription.is_active) {
      // Skip inactive subscriptions
      await db
        .updateTable('digest_runs')
        .set({
          status: 'skipped',
          finished_at: new Date(),
        })
        .where('id', '=', runId)
        .execute();
      
      return {
        success: true,
        message: 'Digest subscription is inactive, skipped',
        data: { subscriptionId, runId, skipped: true },
      };
    }
    
    // Update run status to running
    await db
      .updateTable('digest_runs')
      .set({
        status: 'running',
        started_at: new Date(),
      })
      .where('id', '=', runId)
      .execute();
    
    // Get the last successful run to determine the period
    const lastRun = await db
      .selectFrom('digest_runs')
      .select(['finished_at', 'period_end'])
      .where('subscription_id', '=', subscriptionId)
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'completed')
      .orderBy('finished_at', 'desc')
      .limit(1)
      .executeTakeFirst();
    
    const periodStart = lastRun?.period_end ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
    const periodEnd = new Date();
    
    // Get latest snapshot
    const latestSnapshot = await db
      .selectFrom('snapshots')
      .select(['id'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'complete')
      .orderBy('completed_at', 'desc')
      .limit(1)
      .executeTakeFirst();
    
    const snapshotId = latestSnapshot?.id ?? null;
    
    // Aggregate digest content
    const content = await aggregateDigestContent(
      db,
      tenantId,
      snapshotId,
      periodStart,
      periodEnd,
      subscription.scope_json as Record<string, unknown>,
      logger
    );
    
    // Parse recipients
    const recipients = Array.isArray(subscription.recipients_json)
      ? subscription.recipients_json as string[]
      : [];
    
    // Send emails (or log in dev mode)
    const { emailsSent, emailsFailed } = await sendDigestEmails(
      subscription.name,
      recipients,
      content,
      logger
    );
    
    // Update run status to completed
    await db
      .updateTable('digest_runs')
      .set({
        status: 'completed',
        items_count: content.issuesSummary.newIssues + content.issuesSummary.resolvedIssues,
        recipients_count: recipients.length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
        snapshot_id: snapshotId,
        period_start: periodStart,
        period_end: periodEnd,
        finished_at: new Date(),
        content_json: content,
      })
      .where('id', '=', runId)
      .execute();
    
    logger.info({
      subscriptionId,
      runId,
      emailsSent,
      emailsFailed,
      itemsCount: content.issuesSummary.newIssues + content.issuesSummary.resolvedIssues,
    }, 'Digest send completed');
    
    return {
      success: true,
      message: `Digest sent to ${emailsSent} recipients`,
      data: {
        subscriptionId,
        runId,
        emailsSent,
        emailsFailed,
        itemsCount: content.issuesSummary.newIssues + content.issuesSummary.resolvedIssues,
        processingTimeMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update run status to failed
    await db
      .updateTable('digest_runs')
      .set({
        status: 'failed',
        error_code: 'DIGEST_SEND_FAILED',
        error_message: errorMessage,
        finished_at: new Date(),
      })
      .where('id', '=', runId)
      .execute();
    
    logger.error({ subscriptionId, runId, error: errorMessage }, 'Digest send failed');
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Aggregate content for digest email
 */
async function aggregateDigestContent(
  db: Kysely<Database>,
  tenantId: string,
  snapshotId: string | null,
  periodStart: Date,
  periodEnd: Date,
  scope: Record<string, unknown>,
  logger: Logger
): Promise<{
  periodLabel: string;
  issuesSummary: {
    newIssues: number;
    resolvedIssues: number;
    totalOpen: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    highImpactItems: Array<{
      issueId: string;
      severity: string;
      category: string;
      impactAmount: number | null;
      message?: string;
    }>;
  };
  simulationDeltas?: Array<{
    simulationId: string;
    simulationName: string;
    totalDelta: number;
    deltaPct: number | null;
  }>;
  snapshotId: string | null;
  generatedAt: string;
}> {
  // Build period label
  const periodLabel = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
  
  // Count new issues (created in period)
  let newIssuesQuery = db
    .selectFrom('issues')
    .select(db.fn.count('id').as('count'))
    .where('tenant_id', '=', tenantId)
    .where('created_at', '>=', periodStart)
    .where('created_at', '<=', periodEnd);
  
  if (snapshotId) {
    newIssuesQuery = newIssuesQuery.where('snapshot_id', '=', snapshotId);
  }
  
  const newIssuesResult = await newIssuesQuery.executeTakeFirst();
  const newIssues = Number(newIssuesResult?.count ?? 0);
  
  // Count resolved issues using issue_status_history for accuracy
  let resolvedQuery = db
    .selectFrom('issue_status_history')
    .innerJoin('issues', 'issue_status_history.issue_id', 'issues.id')
    .select((db.fn as any).countDistinct('issue_status_history.issue_id').as('count'))
    .where('issues.tenant_id', '=', tenantId)
    .where('issue_status_history.to_status', '=', 'resolved')
    .where('issue_status_history.created_at', '>=', periodStart)
    .where('issue_status_history.created_at', '<=', periodEnd);
  
  if (snapshotId) {
    resolvedQuery = resolvedQuery.where('issues.snapshot_id', '=', snapshotId);
  }
  
  const resolvedResult = await resolvedQuery.executeTakeFirst();
  const resolvedIssues = Number((resolvedResult as { count?: number } | undefined)?.count ?? 0);
  
  // Count total open issues
  let openQuery = db
    .selectFrom('issues')
    .select(db.fn.count('id').as('count'))
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'open');
  
  if (snapshotId) {
    openQuery = openQuery.where('snapshot_id', '=', snapshotId);
  }
  
  const openResult = await openQuery.executeTakeFirst();
  const totalOpen = Number(openResult?.count ?? 0);
  
  // Get issues by severity
  let severityQuery = db
    .selectFrom('issues')
    .select(['severity'])
    .select(db.fn.count('id').as('count'))
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'open')
    .groupBy('severity');
  
  if (snapshotId) {
    severityQuery = severityQuery.where('snapshot_id', '=', snapshotId);
  }
  
  const severityResults = await severityQuery.execute();
  const bySeverity: Record<string, number> = {};
  for (const row of severityResults) {
    bySeverity[row.severity] = Number(row.count);
  }
  
  // Get issues by category
  let categoryQuery = db
    .selectFrom('issues')
    .select(['category'])
    .select(db.fn.count('id').as('count'))
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'open')
    .groupBy('category');
  
  if (snapshotId) {
    categoryQuery = categoryQuery.where('snapshot_id', '=', snapshotId);
  }
  
  const categoryResults = await categoryQuery.execute();
  const byCategory: Record<string, number> = {};
  for (const row of categoryResults) {
    byCategory[row.category] = Number(row.count);
  }
  
  // Get high impact items
  let highImpactQuery = db
    .selectFrom('issues')
    .select(['id', 'severity', 'category', 'impact_amount'])
    .where('tenant_id', '=', tenantId)
    .where('status', '=', 'open')
    .where('severity', 'in', ['critical', 'high'])
    .orderBy('impact_amount', 'desc')
    .limit(5);
  
  if (snapshotId) {
    highImpactQuery = highImpactQuery.where('snapshot_id', '=', snapshotId);
  }
  
  const highImpactResults = await highImpactQuery.execute();
  const highImpactItems = highImpactResults.map(issue => ({
    issueId: issue.id,
    severity: issue.severity,
    category: issue.category,
    impactAmount: issue.impact_amount,
  }));
  
  // Get simulation deltas if enabled in scope
  let simulationDeltas: Array<{
    simulationId: string;
    simulationName: string;
    totalDelta: number;
    deltaPct: number | null;
  }> | undefined;
  
  const includeSimulationDeltas = scope?.includeSimulationDeltas !== false;
  const deltaThreshold = typeof scope?.deltaThreshold === 'number' ? scope.deltaThreshold : 1000;
  
  if (includeSimulationDeltas) {
    const simulations = await db
      .selectFrom('simulations')
      .innerJoin('simulation_results', 'simulations.id', 'simulation_results.simulation_id')
      .select([
        'simulations.id',
        'simulations.name',
        'simulation_results.total_revenue_delta',
        'simulation_results.total_revenue_delta_pct',
      ])
      .where('simulations.tenant_id', '=', tenantId)
      .where('simulations.status', '=', 'completed')
      .where('simulations.created_at', '>=', periodStart)
      .where('simulations.created_at', '<=', periodEnd)
      .execute();
    
    simulationDeltas = simulations
      .filter(s => Math.abs(s.total_revenue_delta ?? 0) >= deltaThreshold)
      .map(s => ({
        simulationId: s.id,
        simulationName: s.name,
        totalDelta: s.total_revenue_delta ?? 0,
        deltaPct: s.total_revenue_delta_pct ?? null,
      }));
  }
  
  return {
    periodLabel,
    issuesSummary: {
      newIssues,
      resolvedIssues,
      totalOpen,
      bySeverity,
      byCategory,
      highImpactItems,
    },
    simulationDeltas,
    snapshotId,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Send digest emails to recipients
 */
async function sendDigestEmails(
  subscriptionName: string,
  recipients: string[],
  content: Record<string, unknown>,
  logger: Logger
): Promise<{ emailsSent: number; emailsFailed: number }> {
  let emailsSent = 0;
  let emailsFailed = 0;
  
  // In development, just log the email content
  const isDev = process.env.NODE_ENV !== 'production';
  
  for (const recipient of recipients) {
    try {
      if (isDev) {
        // Log to console in development
        logger.info({
          recipient,
          subscriptionName,
          subject: `Cogtics Digest: ${subscriptionName}`,
          content: JSON.stringify(content).substring(0, 500),
        }, 'Would send digest email (dev mode)');
        emailsSent++;
      } else {
        // In production, use email provider
        // This is a placeholder - implement with SES/SendGrid
        await sendEmail(recipient, subscriptionName, content);
        emailsSent++;
      }
    } catch (error) {
      logger.error({ recipient, error }, 'Failed to send digest email');
      emailsFailed++;
    }
  }
  
  return { emailsSent, emailsFailed };
}

/**
 * Send email using configured provider
 * This is a placeholder - implement with SES/SendGrid in production
 */
async function sendEmail(
  recipient: string,
  subscriptionName: string,
  content: Record<string, unknown>
): Promise<void> {
  // Placeholder implementation
  // In production, use @aws-sdk/client-ses or @sendgrid/mail
  
  const subject = `Cogtics Digest: ${subscriptionName}`;
  const html = generateDigestEmailHtml(subscriptionName, content);
  
  // Try to use nodemailer if available
  try {
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? 'noreply@cogtics.io',
      to: recipient,
      subject,
      html,
    });
  } catch (error) {
    // If nodemailer not available, throw to indicate failure
    throw new Error('Email sending not configured');
  }
}

/**
 * Generate HTML for digest email
 */
function generateDigestEmailHtml(
  subscriptionName: string,
  content: Record<string, unknown>
): string {
  const summary = content.issuesSummary as {
    newIssues: number;
    resolvedIssues: number;
    totalOpen: number;
    bySeverity: Record<string, number>;
  };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #ff6500 0%, #ff8533 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; background: #f9f9f9; }
        .metric-row {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
        }
        .metric {
          text-align: center;
          flex: 1;
        }
        .metric-value {
          font-size: 32px;
          font-weight: bold;
          color: #ff6500;
        }
        .metric-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cogtics Digest</h1>
        <p>${subscriptionName}</p>
        <p style="font-size: 12px; opacity: 0.8;">${content.periodLabel}</p>
      </div>
      <div class="content">
        <div class="metric-row">
          <div class="metric">
            <div class="metric-value">${summary.newIssues}</div>
            <div class="metric-label">New Issues</div>
          </div>
          <div class="metric">
            <div class="metric-value">${summary.resolvedIssues}</div>
            <div class="metric-label">Resolved</div>
          </div>
          <div class="metric">
            <div class="metric-value">${summary.totalOpen}</div>
            <div class="metric-label">Open</div>
          </div>
        </div>
        
        <h3>Issues by Severity</h3>
        <ul>
          ${Object.entries(summary.bySeverity).map(([severity, count]) => 
            `<li><strong>${severity}:</strong> ${count}</li>`
          ).join('')}
        </ul>
        
        <p style="margin-top: 30px; text-align: center;">
          <a href="${process.env.APP_URL ?? 'https://app.cogtics.io'}/issues" 
             style="background: #ff6500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View All Issues
          </a>
        </p>
      </div>
      <div class="footer">
        <p>This digest was sent by Cogtics.</p>
        <p>Snapshot: ${content.snapshotId ?? 'N/A'}</p>
      </div>
    </body>
    </html>
  `;
}
