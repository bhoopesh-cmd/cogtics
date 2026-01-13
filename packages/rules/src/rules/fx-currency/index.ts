/**
 * Tier 10: FX and Currency Rules
 * R130-R132 - Exchange rate validation
 */
import type { Rule, RuleContext, RuleIssue } from '../../types.js';
import { getFxRate, fxRateKey, formatDateKey } from '../../utils.js';

// R130: FX Rate Deviation
export const R130_FXRateDeviation: Rule = {
  id: 'R130',
  version: '1.0.0',
  name: 'FX Rate Deviation',
  description: 'Exchange rate used differs significantly from reference rate',
  category: 'fx_currency',
  tier: 'fx_currency',
  severity: 'medium',
  priority: 1,
  requiresData: ['invoices', 'fx_rates'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, fxRates, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const invoice of invoices) {
      if (invoice.currency === config.fx.baseCurrency) continue;

      const metadata = invoice.metadata_json as Record<string, unknown> | null;
      const usedRate = metadata?.fxRate as number;
      if (!usedRate) continue;

      // Get reference rate
      const refRate = getFxRate(
        fxRates,
        invoice.currency,
        config.fx.baseCurrency,
        invoice.invoice_date
      );

      if (refRate === null) continue;

      const deviation = Math.abs(usedRate - refRate) / refRate;

      if (deviation > config.fx.tolerancePct) {
        const baseAmount = invoice.total / usedRate;
        const expectedAmount = invoice.total / refRate;
        const impact = Math.abs(baseAmount - expectedAmount);

        issues.push({
          ruleId: 'R130',
          ruleVersion: '1.0.0',
          category: 'fx_currency',
          severity: 'medium',
          confidence: 0.85,
          impactAmount: impact,
          currency: config.fx.baseCurrency,
          expected: { 
            fxRate: refRate, 
            source: config.fx.rateSource,
            tolerance: config.fx.tolerancePct,
          },
          actual: { 
            fxRate: usedRate, 
            deviation: (deviation * 100).toFixed(2) + '%',
          },
          dimensions: {
            snapshotId,
            invoiceId: invoice.id,
            fromCurrency: invoice.currency,
            toCurrency: config.fx.baseCurrency,
          },
          invoiceId: invoice.id,
          customerId: invoice.customer_id || undefined,
        });
      }
    }

    return issues;
  },
};

// R131: Inconsistent FX Rate
export const R131_InconsistentFXRate: Rule = {
  id: 'R131',
  version: '1.0.0',
  name: 'Inconsistent FX Rate',
  description: 'Different exchange rates used on same invoice',
  category: 'fx_currency',
  tier: 'fx_currency',
  severity: 'medium',
  priority: 2,
  requiresData: ['invoices'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];

    for (const invoice of invoices) {
      if (invoice.currency === config.fx.baseCurrency) continue;

      // Check line-level FX rates
      const lineRates: number[] = [];
      
      for (const line of invoice.lines) {
        const lineMeta = line.metadata_json as Record<string, unknown> | null;
        const lineRate = lineMeta?.fxRate as number;
        if (lineRate) {
          lineRates.push(lineRate);
        }
      }

      if (lineRates.length < 2) continue;

      // Check for variance in rates
      const minRate = Math.min(...lineRates);
      const maxRate = Math.max(...lineRates);
      const variance = (maxRate - minRate) / minRate;

      if (variance > 0.001) { // 0.1% tolerance
        issues.push({
          ruleId: 'R131',
          ruleVersion: '1.0.0',
          category: 'fx_currency',
          severity: 'medium',
          confidence: 0.9,
          expected: { consistentRate: true },
          actual: { 
            minRate, 
            maxRate, 
            variance: (variance * 100).toFixed(3) + '%',
          },
          dimensions: {
            snapshotId,
            invoiceId: invoice.id,
          },
          invoiceId: invoice.id,
          customerId: invoice.customer_id || undefined,
          metadata: { lineRates },
        });
      }
    }

    return issues;
  },
};

// R132: FX Gain/Loss Threshold
export const R132_FXGainLossThreshold: Rule = {
  id: 'R132',
  version: '1.0.0',
  name: 'FX Gain/Loss Threshold',
  description: 'Realized FX gain/loss exceeds threshold',
  category: 'fx_currency',
  tier: 'fx_currency',
  severity: 'medium',
  priority: 3,
  requiresData: ['invoices', 'payments'],
  enabled: true,
  run: (ctx: RuleContext): RuleIssue[] => {
    const { invoices, payments, config, snapshotId } = ctx;
    const issues: RuleIssue[] = [];
    const FX_GAIN_LOSS_THRESHOLD = 1000; // $1000 threshold

    for (const invoice of invoices) {
      if (invoice.currency === config.fx.baseCurrency) continue;

      // Find payments for this invoice
      const invoicePayments = payments.filter(p => p.invoice_id === invoice.id);
      if (invoicePayments.length === 0) continue;

      const invMeta = invoice.metadata_json as Record<string, unknown> | null;
      const invoiceRate = invMeta?.fxRate as number;
      if (!invoiceRate) continue;

      for (const payment of invoicePayments) {
        const payMeta = payment.metadata_json as Record<string, unknown> | null;
        const paymentRate = payMeta?.fxRate as number;
        if (!paymentRate) continue;

        // Calculate FX gain/loss
        const invoiceBaseAmount = invoice.total / invoiceRate;
        const paymentBaseAmount = payment.amount / paymentRate;
        const fxGainLoss = paymentBaseAmount - invoiceBaseAmount;

        if (Math.abs(fxGainLoss) > FX_GAIN_LOSS_THRESHOLD) {
          issues.push({
            ruleId: 'R132',
            ruleVersion: '1.0.0',
            category: 'fx_currency',
            severity: 'medium',
            confidence: 0.9,
            impactAmount: fxGainLoss,
            currency: config.fx.baseCurrency,
            expected: { 
              maxFxGainLoss: FX_GAIN_LOSS_THRESHOLD,
            },
            actual: { 
              fxGainLoss,
              invoiceRate,
              paymentRate,
              type: fxGainLoss > 0 ? 'gain' : 'loss',
            },
            dimensions: {
              snapshotId,
              invoiceId: invoice.id,
              paymentId: payment.id,
            },
            invoiceId: invoice.id,
            customerId: invoice.customer_id || undefined,
          });
        }
      }
    }

    return issues;
  },
};

// Export all FX/currency rules
export const fxCurrencyRules: Rule[] = [
  R130_FXRateDeviation,
  R131_InconsistentFXRate,
  R132_FXGainLossThreshold,
];
