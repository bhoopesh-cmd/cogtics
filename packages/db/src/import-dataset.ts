/**
 * Import CSV dataset into the database
 * Usage: pnpm tsx packages/db/src/import-dataset.ts <dataset-path>
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import { getDatabase, closeDatabase } from './client.js';

interface CSVRow {
  [key: string]: string;
}

// Define import order based on foreign key dependencies
const IMPORT_ORDER = [
  // Core entities (no dependencies)
  'tenants',
  'users',
  'roles',
  'permissions',
  
  // Customers and identities
  'customers',
  'customer_identities',
  
  // Contracts
  'contracts',
  'contract_versions',
  'contract_clause_index',
  
  // Revenue
  'revenue_obligations',
  'revenue_schedules',
  
  // QuickBooks data
  'quickbooks_invoices',
  'quickbooks_invoice_lines',
  'quickbooks_payments',
  'quickbooks_credit_memos',
  
  // Stripe data
  'stripe_invoices',
  'stripe_invoice_lines',
  'stripe_payments',
  'stripe_refunds',
  
  // Issues and detection
  'issues',
  'issue_events',
  
  // Simulations
  'simulations',
  'simulation_results',
  
  // System data
  'sync_runs',
  'exports',
  'email_digests',
  'audit_events',
];

// Map CSV column names to database column names
const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  tenants: {
    tenant_id: 'id',
    tenant_name: 'name',
    data_quality: 'status', // map 'clean'/'messy' to 'active'
  },
  customers: {
    canonical_customer_id: 'id',
    customer_name: 'name',
    primary_domain: 'domain',
  },
  contracts: {
    contract_id: 'id',
    canonical_customer_id: 'customer_id',
  },
  contract_versions: {
    version_id: 'id',
    contract_id: 'contract_id',
  },
  issues: {
    issue_id: 'id',
    canonical_customer_id: 'customer_id',
    contract_id: 'contract_id',
  },
  // Add more mappings as needed
};

// Parse CSV value to appropriate type
function parseValue(value: string, columnName: string, tableName: string): any {
  if (value === '' || value === 'NULL' || value === 'null') {
    return null;
  }
  
  // Special case: map data_quality to status for tenants
  if (tableName === 'tenants' && columnName === 'status') {
    return value === 'clean' ? 'active' : 'trial';
  }
  
  // Boolean columns
  if (columnName.startsWith('is_') || columnName.startsWith('has_') || 
      ['active', 'enabled', 'deleted', 'archived', 'planted_issue', 'near_miss'].includes(columnName)) {
    return value.toLowerCase() === 'true' || value === '1' || value === 'True';
  }
  
  // Numeric columns (ending with _id, _count, amount, price, etc.)
  if (columnName.endsWith('_amount') || columnName.endsWith('_price') || 
      columnName === 'amount' || columnName === 'price' || 
      columnName.endsWith('_total') || columnName === 'total' ||
      columnName.endsWith('_count') || columnName === 'count' ||
      columnName === 'confidence' || columnName === 'variance' ||
      columnName.endsWith('_value')) {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
  
  // JSON columns
  if (columnName.endsWith('_json') || columnName.endsWith('_metadata') || columnName === 'metadata') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  
  // Date columns
  if (columnName.endsWith('_at') || columnName.endsWith('_date') || 
      columnName === 'created' || columnName === 'updated' ||
      columnName.endsWith('_time') || columnName === 'date') {
    if (value) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }
  
  return value;
}

async function importTable(db: any, tableName: string, rows: CSVRow[]) {
  console.log(`\n📥 Importing ${tableName}...`);
  
  if (rows.length === 0) {
    console.log(`  ⚠️  No rows to import`);
    return;
  }
  
  const columns = Object.keys(rows[0]);
  const mappedColumns = columns.map(col => 
    COLUMN_MAPPINGS[tableName]?.[col] || col.toLowerCase()
  );
  
  let imported = 0;
  let skipped = 0;
  
  for (const row of rows) {
    try {
      const values: Record<string, any> = {};
      columns.forEach((col, idx) => {
        const dbCol = mappedColumns[idx];
        values[dbCol] = parseValue(row[col], dbCol, tableName);
      });
      
      await db
        .insertInto(tableName)
        .values(values)
        .onConflict((oc: any) => oc.column('id').doUpdateSet(values))
        .execute();
      
      imported++;
    } catch (err: any) {
      // Skip duplicate key errors or other conflicts
      if (err.code !== '23505') {
        console.error(`  ❌ Error importing row:`, err.message);
      }
      skipped++;
    }
  }
  
  console.log(`  ✅ Imported ${imported} rows (${skipped} skipped)`);
}

async function main() {
  const datasetPath = process.argv[2];
  
  if (!datasetPath) {
    console.error('Usage: pnpm tsx packages/db/src/import-dataset.ts <dataset-path>');
    process.exit(1);
  }
  
  console.log(`\n🚀 Starting dataset import from: ${datasetPath}\n`);
  
  const db = getDatabase();
  
  try {
    // Read all CSV files
    const files = readdirSync(datasetPath).filter(f => f.endsWith('.csv'));
    console.log(`📁 Found ${files.length} CSV files`);
    
    const csvData: Record<string, CSVRow[]> = {};
    
    for (const file of files) {
      const tableName = file.replace('.csv', '');
      const filePath = join(datasetPath, file);
      const fileContent = readFileSync(filePath, 'utf-8');
      
      const rows = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
      
      csvData[tableName] = rows;
      console.log(`  ✓ Loaded ${tableName}: ${rows.length} rows`);
    }
    
    console.log('\n🔄 Importing data in dependency order...');
    
    // Import in order
    for (const tableName of IMPORT_ORDER) {
      if (csvData[tableName]) {
        await importTable(db, tableName, csvData[tableName]);
      }
    }
    
    // Import any remaining tables not in the order list
    const remaining = Object.keys(csvData).filter(t => !IMPORT_ORDER.includes(t));
    if (remaining.length > 0) {
      console.log('\n📦 Importing remaining tables...');
      for (const tableName of remaining) {
        await importTable(db, tableName, csvData[tableName]);
      }
    }
    
    console.log('\n✨ Import complete!');
    
    // Show summary
    const counts = await Promise.all(
      Object.keys(csvData).map(async (tableName) => {
        try {
          const result = await db
            .selectFrom(tableName as any)
            .select((eb: any) => eb.fn.count('id').as('count'))
            .executeTakeFirst();
          return { tableName, count: result?.count || 0 };
        } catch {
          return { tableName, count: 0 };
        }
      })
    );
    
    console.log('\n📊 Database Summary:');
    counts.sort((a, b) => b.count - a.count).forEach(({ tableName, count }) => {
      console.log(`  ${tableName.padEnd(30)} ${count.toString().padStart(6)} rows`);
    });
    
  } catch (err) {
    console.error('\n❌ Import failed:', err);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
