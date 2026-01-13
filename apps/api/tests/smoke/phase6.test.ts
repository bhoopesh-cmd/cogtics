/**
 * Phase 6 Smoke Tests
 * 
 * Verifies that all Phase 6 revenue recognition components are properly exported
 * and configured.
 */
import { describe, it, expect } from 'vitest';

// Test schema exports
import {
  ObligationTypeSchema,
  AllocationMethodSchema,
  RecognitionMethodSchema,
  ObligationStatusSchema,
  ScheduleStatusSchema,
  ReconciliationStatusSchema,
  RevRecComputeJobPayloadSchema,
  RevRecReconcileJobPayloadSchema,
  RevRecSummarySchema,
  TriggerRevRecComputeRequestSchema,
  TriggerRevRecReconcileRequestSchema,
  createObligationId,
  createAllocationId,
  createScheduleId,
  createRecognitionEventId,
  createDeferredBalanceId,
  createReconciliationId,
} from '@cogtics/schemas';

// Test revrec engine exports
import * as revrec from '@cogtics/revrec';

describe('Phase 6: Revenue Recognition - Smoke Tests', () => {
  describe('Schema Exports', () => {
    it('should export ObligationType schema with correct values', () => {
      expect(ObligationTypeSchema).toBeDefined();
      expect(ObligationTypeSchema.options).toContain('subscription');
      expect(ObligationTypeSchema.options).toContain('usage');
      expect(ObligationTypeSchema.options).toContain('one_time');
      expect(ObligationTypeSchema.options).toContain('professional_services');
      expect(ObligationTypeSchema.options).toContain('support');
    });

    it('should export AllocationMethod schema', () => {
      expect(AllocationMethodSchema).toBeDefined();
      expect(AllocationMethodSchema.options).toContain('ssp');
      expect(AllocationMethodSchema.options).toContain('residual');
      expect(AllocationMethodSchema.options).toContain('straight_line');
      expect(AllocationMethodSchema.options).toContain('custom');
    });

    it('should export RecognitionMethod schema', () => {
      expect(RecognitionMethodSchema).toBeDefined();
      expect(RecognitionMethodSchema.options).toContain('straight_line');
      expect(RecognitionMethodSchema.options).toContain('usage_based');
      expect(RecognitionMethodSchema.options).toContain('milestone');
      expect(RecognitionMethodSchema.options).toContain('as_invoiced');
    });

    it('should export ObligationStatus schema', () => {
      expect(ObligationStatusSchema).toBeDefined();
      expect(ObligationStatusSchema.options).toContain('active');
      expect(ObligationStatusSchema.options).toContain('completed');
      expect(ObligationStatusSchema.options).toContain('cancelled');
      expect(ObligationStatusSchema.options).toContain('amended');
    });

    it('should export ScheduleStatus schema', () => {
      expect(ScheduleStatusSchema).toBeDefined();
      expect(ScheduleStatusSchema.options).toContain('pending');
      expect(ScheduleStatusSchema.options).toContain('partial');
      expect(ScheduleStatusSchema.options).toContain('recognized');
      expect(ScheduleStatusSchema.options).toContain('cancelled');
    });

    it('should export ReconciliationStatus schema', () => {
      expect(ReconciliationStatusSchema).toBeDefined();
      expect(ReconciliationStatusSchema.options).toContain('matched');
      expect(ReconciliationStatusSchema.options).toContain('timing_variance');
      expect(ReconciliationStatusSchema.options).toContain('amount_variance');
      expect(ReconciliationStatusSchema.options).toContain('missing_invoice');
      expect(ReconciliationStatusSchema.options).toContain('unmatched');
    });

    it('should export job payload schemas', () => {
      expect(RevRecComputeJobPayloadSchema).toBeDefined();
      expect(RevRecReconcileJobPayloadSchema).toBeDefined();
    });

    it('should export API schemas', () => {
      expect(RevRecSummarySchema).toBeDefined();
      expect(TriggerRevRecComputeRequestSchema).toBeDefined();
      expect(TriggerRevRecReconcileRequestSchema).toBeDefined();
    });
  });

  describe('ID Generators', () => {
    it('should generate obligation IDs with correct prefix', () => {
      const id = createObligationId();
      expect(id).toMatch(/^obl_[a-zA-Z0-9_-]+$/);
    });

    it('should generate allocation IDs with correct prefix', () => {
      const id = createAllocationId();
      expect(id).toMatch(/^alc_[a-zA-Z0-9_-]+$/);
    });

    it('should generate schedule IDs with correct prefix', () => {
      const id = createScheduleId();
      expect(id).toMatch(/^sch_[a-zA-Z0-9_-]+$/);
    });

    it('should generate recognition event IDs with correct prefix', () => {
      const id = createRecognitionEventId();
      expect(id).toMatch(/^rev_[a-zA-Z0-9_-]+$/);
    });

    it('should generate deferred balance IDs with correct prefix', () => {
      const id = createDeferredBalanceId();
      expect(id).toMatch(/^def_[a-zA-Z0-9_-]+$/);
    });

    it('should generate reconciliation IDs with correct prefix', () => {
      const id = createReconciliationId();
      expect(id).toMatch(/^rec_[a-zA-Z0-9_-]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => createObligationId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('RevRec Engine Functions', () => {
    it('should export identifyObligations function', () => {
      expect(revrec.identifyObligations).toBeInstanceOf(Function);
    });

    it('should export allocatePrices function', () => {
      expect(revrec.allocatePrices).toBeInstanceOf(Function);
    });

    it('should export validateAllocations function', () => {
      expect(revrec.validateAllocations).toBeInstanceOf(Function);
    });

    it('should export generateSchedule function', () => {
      expect(revrec.generateSchedule).toBeInstanceOf(Function);
    });

    it('should export generateStraightLineSchedule function', () => {
      expect(revrec.generateStraightLineSchedule).toBeInstanceOf(Function);
    });

    it('should export recognition event functions', () => {
      expect(revrec.createRecognitionEvents).toBeInstanceOf(Function);
      expect(revrec.createUsageEvent).toBeInstanceOf(Function);
      expect(revrec.createAdjustmentEvent).toBeInstanceOf(Function);
      expect(revrec.createCancellationEvent).toBeInstanceOf(Function);
      expect(revrec.createAmendmentEvent).toBeInstanceOf(Function);
      expect(revrec.calculateCumulativeRecognized).toBeInstanceOf(Function);
      expect(revrec.applyEventsToSchedule).toBeInstanceOf(Function);
    });

    it('should export deferred balance functions', () => {
      expect(revrec.computeDeferredBalances).toBeInstanceOf(Function);
      expect(revrec.computePeriodBalance).toBeInstanceOf(Function);
      expect(revrec.validateBalanceRollforward).toBeInstanceOf(Function);
      expect(revrec.getBalanceAsOf).toBeInstanceOf(Function);
    });

    it('should export reconciliation functions', () => {
      expect(revrec.reconcileSchedulesWithInvoices).toBeInstanceOf(Function);
      expect(revrec.DEFAULT_RECONCILIATION_CONFIG).toBeDefined();
    });

    it('should export convenience pipeline functions', () => {
      expect(revrec.computeRevRec).toBeInstanceOf(Function);
      expect(revrec.reconcileContract).toBeInstanceOf(Function);
    });
  });

  describe('RevRec Engine Basic Functionality', () => {
    it('should identify obligations from simple contract', () => {
      const contract: revrec.ContractInput = {
        id: 'test_contract',
        customerId: 'test_customer',
        name: 'Test Contract',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        arr: 120000,
        currency: 'USD',
        billingFrequency: 'monthly',
        terms: [],
      };

      const obligations = revrec.identifyObligations(contract);

      expect(obligations).toHaveLength(1);
      expect(obligations[0].obligationType).toBe('subscription');
      expect(obligations[0].transactionPrice).toBe(120000);
    });

    it('should allocate 100% to single obligation', () => {
      const obligations: revrec.IdentifiedObligation[] = [{
        obligationType: 'subscription',
        description: 'Test',
        transactionPrice: 120000,
        standaloneSellIingPrice: null,
        serviceStartDate: new Date('2024-01-01'),
        serviceEndDate: new Date('2024-12-31'),
        sourceTermIds: [],
        allocationMethod: 'straight_line',
        recognitionMethod: 'straight_line',
      }];

      const allocations = revrec.allocatePrices(obligations, 120000);

      expect(allocations).toHaveLength(1);
      expect(allocations[0].allocationPct).toBe(100);
      expect(allocations[0].allocatedAmount).toBe(120000);
    });

    it('should generate straight-line schedule', () => {
      const schedules = revrec.generateStraightLineSchedule(
        new Date(2024, 0, 1),  // Jan 1, 2024
        new Date(2024, 2, 31), // Mar 31, 2024
        30000,
        'monthly'
      );

      expect(schedules.length).toBe(3);
      
      const total = schedules.reduce((sum, s) => sum + s.scheduledAmount, 0);
      expect(total).toBeCloseTo(30000, 0);
    });

    it('should compute full rev-rec pipeline', () => {
      const contract: revrec.ContractInput = {
        id: 'test_contract',
        customerId: 'test_customer',
        name: 'Test Contract',
        startDate: new Date(2024, 0, 1),  // Jan 1, 2024
        endDate: new Date(2024, 2, 31),   // Mar 31, 2024
        arr: 30000,
        currency: 'USD',
        billingFrequency: 'monthly',
        terms: [],
      };

      const output = revrec.computeRevRec(contract);

      expect(output.obligations).toHaveLength(1);
      expect(output.allocations).toHaveLength(1);
      expect(output.schedules).toHaveLength(1);
      expect(output.schedules[0].length).toBe(3); // 3 monthly periods
    });

    it('should reconcile schedules with invoices', () => {
      const schedules: revrec.SchedulePeriod[] = [{
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        scheduledAmount: 10000,
        recognizedAmount: 10000,
        deferredAmount: 0,
        periodDays: 31,
        dailyRate: 322.58,
        recognitionMethod: 'straight_line',
        status: 'recognized',
      }];

      const invoices: revrec.InvoiceInput[] = [{
        id: 'inv_1',
        contractId: 'contract_1',
        invoiceDate: new Date('2024-01-01'),
        total: 10000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      }];

      const result = revrec.reconcileSchedulesWithInvoices(schedules, invoices, 'contract_1');

      expect(result.reconciliations).toHaveLength(1);
      expect(result.reconciliations[0].status).toBe('matched');
      expect(result.summary.matched).toBe(1);
    });
  });

  describe('Job Payload Validation', () => {
    it('should validate compute job payload', () => {
      const payload = {
        type: 'revrec.compute',
        tenantId: 'tenant_123',
        snapshotId: 'snap_456',
        forceRecompute: true,
      };

      const result = RevRecComputeJobPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should validate reconcile job payload', () => {
      const payload = {
        type: 'revrec.reconcile',
        tenantId: 'tenant_123',
        snapshotId: 'snap_456',
        periodStart: '2024-01-01',
        periodEnd: '2024-12-31',
      };

      const result = RevRecReconcileJobPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should reject invalid compute job payload', () => {
      const payload = {
        type: 'revrec.compute',
        // Missing required fields
      };

      const result = RevRecComputeJobPayloadSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
