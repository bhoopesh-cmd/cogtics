/**
 * Snapshot scoping tests
 */
import { describe, it, expect } from 'vitest';
import {
  SnapshotListResponseSchema,
  SnapshotDetailResponseSchema,
  CustomerListResponseSchema,
  ContractListResponseSchema,
  InvoiceListResponseSchema,
  CanonicalDataQueryParamsSchema,
} from '@cogtics/schemas';

describe('Snapshot Scoping Schemas', () => {
  it('should require snapshotId on list responses', () => {
    const customers = CustomerListResponseSchema.safeParse({
      customers: [],
      total: 0,
      snapshotId: 'snap_01',
    });

    const contracts = ContractListResponseSchema.safeParse({
      contracts: [],
      total: 0,
      snapshotId: 'snap_01',
    });

    const invoices = InvoiceListResponseSchema.safeParse({
      invoices: [],
      total: 0,
      snapshotId: 'snap_01',
    });

    expect(customers.success).toBe(true);
    expect(contracts.success).toBe(true);
    expect(invoices.success).toBe(true);
  });

  it('should reject list responses missing snapshotId', () => {
    const result = CustomerListResponseSchema.safeParse({
      customers: [],
      total: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should validate snapshot list and detail responses', () => {
    const listResult = SnapshotListResponseSchema.safeParse({
      snapshots: [],
      total: 0,
    });

    const detailResult = SnapshotDetailResponseSchema.safeParse({
      id: 'snap_01',
      tenantId: 'tenant_01',
      sourceRunId: null,
      status: 'pending',
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
      syncRuns: [],
    });

    expect(listResult.success).toBe(true);
    expect(detailResult.success).toBe(true);
  });

  it('should parse canonical data query params with defaults', () => {
    const result = CanonicalDataQueryParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBeGreaterThan(0);
      expect(result.data.offset).toBeGreaterThanOrEqual(0);
    }
  });
});
