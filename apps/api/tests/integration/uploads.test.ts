/**
 * Upload Integration Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from '@cogtics/db';
import {
  createUploadId,
  createUploadFileId,
  createParseRunId,
  createParseErrorId,
  UploadMappingSchema,
  CustomerRowSchema,
  getRowSchemaForEntity,
} from '@cogtics/schemas';

// Test database connection
let db: Kysely<Database>;
const TEST_TENANT_ID = 'test_tenant_uploads';
const TEST_USER_ID = 'test_user_uploads';

// Skip tests if DATABASE_URL not set
const SKIP_DB_TESTS = !process.env.DATABASE_URL;

describe('Upload Integration Tests', () => {
  beforeAll(async () => {
    if (SKIP_DB_TESTS) {
      console.error('Skipping integration tests: DATABASE_URL not set');
      return;
    }
    
    const connectionString = process.env.DATABASE_URL;
    
    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({ connectionString }),
      }),
    });

    // Ensure test tenant exists
    await db
      .insertInto('tenants')
      .values({
        id: TEST_TENANT_ID,
        name: 'Test Tenant Uploads',
        status: 'active',
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    // Ensure test user exists
    await db
      .insertInto('users')
      .values({
        id: TEST_USER_ID,
        email: 'test-uploads@example.com',
        name: 'Test User Uploads',
      })
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  });

  afterAll(async () => {
    if (SKIP_DB_TESTS) return;
    // Cleanup test data
    await db.deleteFrom('uploads').where('tenant_id', '=', TEST_TENANT_ID).execute();
    await db.destroy();
  });

  beforeEach(async () => {
    if (SKIP_DB_TESTS) return;
    // Clean up uploads for each test
    await db.deleteFrom('uploads').where('tenant_id', '=', TEST_TENANT_ID).execute();
  });

  describe('Upload ID Generation', () => {
    it('should generate unique upload IDs', () => {
      const id1 = createUploadId();
      const id2 = createUploadId();
      
      expect(id1).toMatch(/^upl_/);
      expect(id2).toMatch(/^upl_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique file IDs', () => {
      const id1 = createUploadFileId();
      const id2 = createUploadFileId();
      
      expect(id1).toMatch(/^uplf_/);
      expect(id2).toMatch(/^uplf_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique parse run IDs', () => {
      const id1 = createParseRunId();
      const id2 = createParseRunId();
      
      expect(id1).toMatch(/^prun_/);
      expect(id2).toMatch(/^prun_/);
      expect(id1).not.toBe(id2);
    });

    it('should generate unique parse error IDs', () => {
      const id1 = createParseErrorId();
      const id2 = createParseErrorId();
      
      expect(id1).toMatch(/^perr_/);
      expect(id2).toMatch(/^perr_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Upload Mapping Schema', () => {
    it('should validate valid column mapping', () => {
      const mapping = {
        entityType: 'customer',
        columns: [
          { sourceColumn: 'Company', targetField: 'name' },
          { sourceColumn: 'ID', targetField: 'external_id' },
        ],
        skipHeaderRow: true,
        delimiter: ',',
      };

      const result = UploadMappingSchema.safeParse(mapping);
      expect(result.success).toBe(true);
    });

    it('should reject invalid entity type', () => {
      const mapping = {
        entityType: 'invalid_type',
        columns: [],
      };

      const result = UploadMappingSchema.safeParse(mapping);
      expect(result.success).toBe(false);
    });
  });

  describe('Customer Row Validation', () => {
    it('should validate valid customer row', () => {
      const row = {
        external_id: 'CUST001',
        name: 'Acme Inc',
        email: 'contact@acme.com',
        phone: '+1-555-0100',
      };

      const result = CustomerRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });

    it('should reject row without external_id', () => {
      const row = {
        name: 'Acme Inc',
        email: 'contact@acme.com',
      };

      const result = CustomerRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should reject row without name', () => {
      const row = {
        external_id: 'CUST001',
        email: 'contact@acme.com',
      };

      const result = CustomerRowSchema.safeParse(row);
      expect(result.success).toBe(false);
    });

    it('should allow empty email', () => {
      const row = {
        external_id: 'CUST001',
        name: 'Acme Inc',
        email: '',
      };

      const result = CustomerRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    });
  });

  describe('Row Schema Selector', () => {
    it('should return CustomerRowSchema for customer entity', () => {
      const schema = getRowSchemaForEntity('customer');
      expect(schema).toBeDefined();
    });

    it('should return InvoiceRowSchema for invoice entity', () => {
      const schema = getRowSchemaForEntity('invoice');
      expect(schema).toBeDefined();
    });

    it('should return ContractRowSchema for contract entity', () => {
      const schema = getRowSchemaForEntity('contract');
      expect(schema).toBeDefined();
    });
  });

  describe.skipIf(SKIP_DB_TESTS)('Database Operations', () => {
    it('should create upload record', async () => {
      const uploadId = createUploadId();
      
      await db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: TEST_TENANT_ID,
          type: 'csv',
          status: 'pending',
          entity_type: 'customer',
          display_name: 'Test Upload',
          file_count: 1,
          created_by: TEST_USER_ID,
          metadata_json: {},
        })
        .execute();

      const upload = await db
        .selectFrom('uploads')
        .selectAll()
        .where('id', '=', uploadId)
        .executeTakeFirst();

      expect(upload).toBeDefined();
      expect(upload?.status).toBe('pending');
      expect(upload?.type).toBe('csv');
    });

    it('should create upload file record', async () => {
      const uploadId = createUploadId();
      const fileId = createUploadFileId();
      
      // Create upload first
      await db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: TEST_TENANT_ID,
          type: 'csv',
          status: 'pending',
          file_count: 1,
          metadata_json: {},
        })
        .execute();

      // Create file
      await db
        .insertInto('upload_files')
        .values({
          id: fileId,
          tenant_id: TEST_TENANT_ID,
          upload_id: uploadId,
          file_name: 'customers.csv',
          content_type: 'text/csv',
          s3_key: `uploads/${TEST_TENANT_ID}/${uploadId}/customers.csv`,
          size_bytes: 1024,
          metadata_json: {},
        })
        .execute();

      const file = await db
        .selectFrom('upload_files')
        .selectAll()
        .where('id', '=', fileId)
        .executeTakeFirst();

      expect(file).toBeDefined();
      expect(file?.file_name).toBe('customers.csv');
    });

    it('should create parse run record', async () => {
      const uploadId = createUploadId();
      const parseRunId = createParseRunId();
      
      await db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: TEST_TENANT_ID,
          type: 'csv',
          status: 'pending',
          file_count: 1,
          metadata_json: {},
        })
        .execute();

      await db
        .insertInto('upload_parse_runs')
        .values({
          id: parseRunId,
          tenant_id: TEST_TENANT_ID,
          upload_id: uploadId,
          status: 'pending',
          run_number: 1,
          stats_json: {},
        })
        .execute();

      const parseRun = await db
        .selectFrom('upload_parse_runs')
        .selectAll()
        .where('id', '=', parseRunId)
        .executeTakeFirst();

      expect(parseRun).toBeDefined();
      expect(parseRun?.run_number).toBe(1);
    });

    it('should create parse error record', async () => {
      const uploadId = createUploadId();
      const parseRunId = createParseRunId();
      const errorId = createParseErrorId();
      
      await db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: TEST_TENANT_ID,
          type: 'csv',
          status: 'pending',
          file_count: 1,
          metadata_json: {},
        })
        .execute();

      await db
        .insertInto('upload_parse_runs')
        .values({
          id: parseRunId,
          tenant_id: TEST_TENANT_ID,
          upload_id: uploadId,
          status: 'running',
          run_number: 1,
          stats_json: {},
        })
        .execute();

      await db
        .insertInto('upload_parse_errors')
        .values({
          id: errorId,
          tenant_id: TEST_TENANT_ID,
          upload_id: uploadId,
          parse_run_id: parseRunId,
          row_number: 5,
          field: 'email',
          error_type: 'invalid_email',
          error_message: 'Invalid email format',
          raw_value: 'not-an-email',
        })
        .execute();

      const error = await db
        .selectFrom('upload_parse_errors')
        .selectAll()
        .where('id', '=', errorId)
        .executeTakeFirst();

      expect(error).toBeDefined();
      expect(error?.row_number).toBe(5);
      expect(error?.error_type).toBe('invalid_email');
    });

    it('should update upload status', async () => {
      const uploadId = createUploadId();
      
      await db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: TEST_TENANT_ID,
          type: 'csv',
          status: 'pending',
          file_count: 1,
          metadata_json: {},
        })
        .execute();

      await db
        .updateTable('uploads')
        .set({
          status: 'completed',
          total_rows: 100,
          valid_rows: 95,
          error_count: 5,
          completed_at: new Date(),
        })
        .where('id', '=', uploadId)
        .execute();

      const upload = await db
        .selectFrom('uploads')
        .selectAll()
        .where('id', '=', uploadId)
        .executeTakeFirst();

      expect(upload?.status).toBe('completed');
      expect(upload?.total_rows).toBe(100);
      expect(upload?.valid_rows).toBe(95);
    });

    it('should cascade delete upload files on upload delete', async () => {
      const uploadId = createUploadId();
      const fileId = createUploadFileId();
      
      await db
        .insertInto('uploads')
        .values({
          id: uploadId,
          tenant_id: TEST_TENANT_ID,
          type: 'csv',
          status: 'pending',
          file_count: 1,
          metadata_json: {},
        })
        .execute();

      await db
        .insertInto('upload_files')
        .values({
          id: fileId,
          tenant_id: TEST_TENANT_ID,
          upload_id: uploadId,
          file_name: 'test.csv',
          content_type: 'text/csv',
          s3_key: 'test/key',
          metadata_json: {},
        })
        .execute();

      // Delete upload
      await db.deleteFrom('uploads').where('id', '=', uploadId).execute();

      // File should also be deleted
      const file = await db
        .selectFrom('upload_files')
        .selectAll()
        .where('id', '=', fileId)
        .executeTakeFirst();

      expect(file).toBeUndefined();
    });
  });

  describe.skipIf(SKIP_DB_TESTS)('Upload Templates', () => {
    it('should have customer template', async () => {
      const template = await db
        .selectFrom('upload_templates')
        .selectAll()
        .where('entity_type', '=', 'customer')
        .executeTakeFirst();

      expect(template).toBeDefined();
      expect(template?.display_name).toBe('Customers');
    });

    it('should have invoice template', async () => {
      const template = await db
        .selectFrom('upload_templates')
        .selectAll()
        .where('entity_type', '=', 'invoice')
        .executeTakeFirst();

      expect(template).toBeDefined();
      expect(template?.display_name).toBe('Invoices');
    });

    it('should have contract template', async () => {
      const template = await db
        .selectFrom('upload_templates')
        .selectAll()
        .where('entity_type', '=', 'contract')
        .executeTakeFirst();

      expect(template).toBeDefined();
      expect(template?.display_name).toBe('Contracts');
    });
  });
});
