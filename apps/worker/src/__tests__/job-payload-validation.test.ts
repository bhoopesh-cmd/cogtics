/**
 * Worker job payload validation tests
 */
import { describe, it, expect } from 'vitest';
import { JobPayloadSchema } from '@cogtics/schemas';

describe('JobPayloadSchema', () => {
  it('should accept valid detect.run payload', () => {
    const result = JobPayloadSchema.safeParse({
      type: 'detect.run',
      tenantId: 'tenant_01',
      snapshotId: 'snap_01',
    });

    expect(result.success).toBe(true);
  });

  it('should reject payload without type', () => {
    const result = JobPayloadSchema.safeParse({
      tenantId: 'tenant_01',
    });

    expect(result.success).toBe(false);
  });

  it('should reject payload with unknown type', () => {
    const result = JobPayloadSchema.safeParse({
      type: 'unknown.job',
      tenantId: 'tenant_01',
    });

    expect(result.success).toBe(false);
  });
});
