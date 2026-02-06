/**
 * Data Preprocessor
 * Normalizes and prepares data for rule execution
 */
import { differenceInHours } from 'date-fns';
import type { DetectionConfig } from '@cogtics/schemas';
import type {
  ContractWithTerms,
  InvoiceWithLines,
  DataQualityReport,
  PreprocessedData,
  PreprocessorOptions,
  RuleContext,
} from './types.js';
import type { Payment, UsageEvent, Snapshot } from '@cogtics/db';
import { round, getFxRate, fxRateKey } from './utils.js';

// ============================================
// Main Preprocessor
// ============================================

/**
 * Preprocess data before rule execution
 */
export function preprocessData(
  contracts: ContractWithTerms[],
  invoices: InvoiceWithLines[],
  payments: Payment[],
  usageEvents: UsageEvent[],
  fxRates: Map<string, number>,
  config: DetectionConfig,
  snapshotDate: Date,
  priorSnapshot?: Snapshot
): PreprocessedData {
  const options: PreprocessorOptions = {
    excludeTax: config.taxFees.excludeFromComparison,
    excludeFees: config.taxFees.excludeFromComparison,
    netCredits: config.credits.netWithInvoices,
    convertCurrency: true,
    baseCurrency: config.fx.baseCurrency,
  };

  // Build data quality report
  const dataQuality = buildDataQualityReport(
    contracts,
    invoices,
    usageEvents,
    fxRates,
    config,
    snapshotDate,
    priorSnapshot
  );

  // Process invoices (exclude tax/fees, net credits)
  const processedInvoices = invoices.map(inv => 
    processInvoice(inv, options, config, fxRates)
  );

  // Process contracts (normalize amounts)
  const processedContracts = contracts.map(contract =>
    processContract(contract, options, config, fxRates)
  );

  return {
    contracts: processedContracts,
    invoices: processedInvoices,
    payments,
    usageEvents,
    dataQuality,
  };
}

// ============================================
// Invoice Processing
// ============================================

function processInvoice(
  invoice: InvoiceWithLines,
  options: PreprocessorOptions,
  config: DetectionConfig,
  fxRates: Map<string, number>
): InvoiceWithLines {
  let processedLines = [...invoice.lines];

  // Exclude tax lines
  if (options.excludeTax) {
    processedLines = processedLines.filter(line => {
      const desc = (line.description || '').toUpperCase();
      return !config.taxFees.taxLineItemCodes.some(code => 
        desc.includes(code.toUpperCase())
      );
    });
  }

  // Exclude fee lines
  if (options.excludeFees) {
    processedLines = processedLines.filter(line => {
      const desc = (line.description || '').toUpperCase();
      return !config.taxFees.feeLineItemCodes.some(code => 
        desc.includes(code.toUpperCase())
      );
    });
  }

  // Calculate new total from processed lines
  const processedTotal = processedLines.reduce((sum, line) => sum + line.amount, 0);

  // Convert currency if needed
  let finalTotal = processedTotal;
  if (options.convertCurrency && invoice.currency !== options.baseCurrency) {
    const rate = getFxRate(
      fxRates,
      invoice.currency,
      options.baseCurrency,
      invoice.invoice_date
    );
    if (rate) {
      finalTotal = round(processedTotal * rate, 2);
    }
  }

  return {
    ...invoice,
    lines: processedLines,
    total: finalTotal,
    // Store original for reference
    metadata_json: {
      ...(typeof invoice.metadata_json === 'object' ? invoice.metadata_json : {}),
      _originalTotal: invoice.total,
      _processedTotal: processedTotal,
      _currencyConverted: options.convertCurrency && invoice.currency !== options.baseCurrency,
    },
  };
}

function processContract(
  contract: ContractWithTerms,
  options: PreprocessorOptions,
  config: DetectionConfig,
  fxRates: Map<string, number>
): ContractWithTerms {
  // Convert ARR to base currency if needed
  let processedArr = contract.arr;
  
  if (options.convertCurrency && 
      contract.currency !== options.baseCurrency && 
      processedArr !== null) {
    const rate = getFxRate(
      fxRates,
      contract.currency,
      options.baseCurrency,
      contract.start_date || new Date()
    );
    if (rate) {
      processedArr = round(processedArr * rate, 2);
    }
  }

  return {
    ...contract,
    arr: processedArr,
    metadata_json: {
      ...(typeof contract.metadata_json === 'object' ? contract.metadata_json : {}),
      _originalArr: contract.arr,
      _currencyConverted: options.convertCurrency && contract.currency !== options.baseCurrency,
    },
  };
}

// ============================================
// Data Quality Report
// ============================================

function buildDataQualityReport(
  contracts: ContractWithTerms[],
  invoices: InvoiceWithLines[],
  usageEvents: UsageEvent[],
  fxRates: Map<string, number>,
  config: DetectionConfig,
  snapshotDate: Date,
  priorSnapshot?: Snapshot
): DataQualityReport {
  // Check usage data staleness
  let usageDataAgeHours = 0;
  let usageDataStale = false;
  
  if (usageEvents.length > 0) {
    const latestUsage = usageEvents.reduce((latest, event) => {
      return event.event_time > latest ? event.event_time : latest;
    }, usageEvents[0].event_time);
    
    usageDataAgeHours = differenceInHours(snapshotDate, latestUsage);
    usageDataStale = usageDataAgeHours > config.gating.usageStalenessHours;
  }

  // Check CRM data staleness (based on contract created_at)
  let crmDataAgeHours = 0;
  let crmDataStale = false;
  
  if (contracts.length > 0) {
    const latestContract = contracts.reduce((latest, contract) => {
      return contract.created_at > latest ? contract.created_at : latest;
    }, contracts[0].created_at);
    
    crmDataAgeHours = differenceInHours(snapshotDate, latestContract);
    crmDataStale = crmDataAgeHours > config.gating.crmStalenessHours;
  }

  // Build contract readiness map
  const contractReadiness = new Map<string, number>();
  for (const contract of contracts) {
    // Default readiness score - would come from contract_readiness table
    contractReadiness.set(contract.id, 1.0);
  }

  // Track available FX currencies
  const fxRatesAvailable = new Set<string>();
  for (const key of fxRates.keys()) {
    const [from, to] = key.split('_');
    fxRatesAvailable.add(from);
    fxRatesAvailable.add(to);
  }

  // Check for missing master data
  const missingMasterData: string[] = [];
  
  // Check invoices without customers
  const invoicesWithoutCustomer = invoices.filter(inv => !inv.customer_id);
  if (invoicesWithoutCustomer.length > 0) {
    missingMasterData.push(`${invoicesWithoutCustomer.length} invoices without customer`);
  }

  // Check contracts without customers
  const contractsWithoutCustomer = contracts.filter(c => !c.customer_id);
  if (contractsWithoutCustomer.length > 0) {
    missingMasterData.push(`${contractsWithoutCustomer.length} contracts without customer`);
  }

  // Check invoices without contracts (orphan invoices)
  const invoicesWithoutContract = invoices.filter(inv => !inv.contract_id);
  if (invoicesWithoutContract.length > 0) {
    missingMasterData.push(`${invoicesWithoutContract.length} orphan invoices without contract`);
  }

  // Calculate snapshot completeness
  const snapshotCompleteness = calculateSnapshotCompleteness(
    contracts,
    invoices,
    priorSnapshot
  );

  return {
    snapshotCompleteness,
    usageDataStale,
    usageDataAgeHours,
    crmDataStale,
    crmDataAgeHours,
    contractReadiness,
    missingMasterData,
    fxRatesAvailable,
    priorSnapshot,
  };
}

function calculateSnapshotCompleteness(
  contracts: ContractWithTerms[],
  invoices: InvoiceWithLines[],
  priorSnapshot?: Snapshot
): number {
  if (!priorSnapshot) {
    return 1.0; // No prior snapshot to compare
  }

  // Compare record counts with prior snapshot
  const priorCounts = priorSnapshot.record_counts as Record<string, number> | null;
  if (!priorCounts) {
    return 1.0;
  }

  const currentContractCount = contracts.length;
  const currentInvoiceCount = invoices.length;
  
  const priorContractCount = priorCounts.contracts || 0;
  const priorInvoiceCount = priorCounts.invoices || 0;

  if (priorContractCount === 0 && priorInvoiceCount === 0) {
    return 1.0;
  }

  // Calculate ratio (capped at 1.0)
  const contractRatio = priorContractCount > 0 
    ? Math.min(currentContractCount / priorContractCount, 1.0) 
    : 1.0;
  const invoiceRatio = priorInvoiceCount > 0 
    ? Math.min(currentInvoiceCount / priorInvoiceCount, 1.0) 
    : 1.0;

  return (contractRatio + invoiceRatio) / 2;
}

// ============================================
// Credit Netting
// ============================================

/**
 * Net credits against invoices
 * Returns invoices with adjusted amounts
 */
export function netCreditsWithInvoices(
  invoices: InvoiceWithLines[],
  config: DetectionConfig
): InvoiceWithLines[] {
  if (!config.credits.netWithInvoices) {
    return invoices;
  }

  // Identify credit memos (negative total or specific status)
  const credits = invoices.filter(inv => inv.total < 0);
  const regularInvoices = invoices.filter(inv => inv.total >= 0);

  // For each credit, find matching invoice by contract and apply
  const adjustedInvoices = regularInvoices.map(invoice => {
    const matchingCredits = credits.filter(c => 
      c.contract_id === invoice.contract_id &&
      c.customer_id === invoice.customer_id
    );

    const creditAmount = matchingCredits.reduce((sum, c) => sum + c.total, 0);
    
    return {
      ...invoice,
      total: invoice.total + creditAmount, // creditAmount is negative
      metadata_json: {
        ...(typeof invoice.metadata_json === 'object' ? invoice.metadata_json : {}),
        _creditApplied: creditAmount,
      },
    };
  });

  return adjustedInvoices;
}
