# Manual Uploads

This document describes the manual upload feature for importing CSV files and PDF contracts into Cogtics.

## Overview

Manual uploads allow you to import data from files that aren't connected via automated integrations. This is useful for:

- Importing historical data
- Adding data from one-off sources
- Uploading contracts for text extraction
- Migrating data from legacy systems

## Supported File Types

### CSV Files

CSV uploads support the following entity types:

| Entity Type | Description | Required Fields |
|-------------|-------------|-----------------|
| `customer` | Customer/company records | `external_id`, `name` |
| `invoice` | Invoice records | `external_id`, `customer_id`, `invoice_date`, `total` |
| `contract` | Contract records | `external_id`, `customer_id`, `name`, `start_date` |
| `payment` | Payment records | `external_id`, `customer_id`, `amount`, `date` |
| `product` | Product/SKU records | `external_id`, `name` |

### PDF Files

PDF uploads are processed for contract document intelligence:
- Text is automatically extracted from the PDF
- Documents are stored in S3/MinIO for future reference
- Extracted text is available for analysis

## CSV Format Requirements

### General Requirements

- UTF-8 encoding
- First row must be headers
- Comma-separated values (configurable delimiter)
- Maximum file size: 50MB
- Maximum rows: 1,000,000

### Customer Template

```csv
external_id,name,email,phone,billing_address,tax_id
CUST001,Acme Inc,billing@acme.com,+1-555-0100,"123 Main St, NYC",12-3456789
```

| Column | Required | Type | Description |
|--------|----------|------|-------------|
| `external_id` | Yes | String | Unique identifier from source system |
| `name` | Yes | String | Company/customer name |
| `email` | No | Email | Contact email address |
| `phone` | No | String | Phone number |
| `billing_address` | No | String | Billing address |
| `tax_id` | No | String | Tax identification number |

### Invoice Template

```csv
external_id,customer_id,invoice_date,due_date,total,currency,status
INV-001,CUST001,2024-01-15,2024-02-15,1500.00,USD,open
```

| Column | Required | Type | Description |
|--------|----------|------|-------------|
| `external_id` | Yes | String | Invoice number/ID |
| `customer_id` | Yes | String | Reference to customer external_id |
| `invoice_date` | Yes | Date | Invoice issue date (YYYY-MM-DD) |
| `due_date` | No | Date | Payment due date |
| `total` | Yes | Number | Total invoice amount |
| `currency` | No | String | Currency code (default: USD) |
| `status` | No | String | Invoice status |

### Contract Template

```csv
external_id,customer_id,name,start_date,end_date,value,status
CTR-001,CUST001,Enterprise Agreement,2024-01-01,2024-12-31,50000.00,active
```

| Column | Required | Type | Description |
|--------|----------|------|-------------|
| `external_id` | Yes | String | Contract ID |
| `customer_id` | Yes | String | Reference to customer external_id |
| `name` | Yes | String | Contract name |
| `start_date` | Yes | Date | Contract start date |
| `end_date` | No | Date | Contract end date |
| `value` | No | Number | Contract value |
| `status` | No | String | Contract status |

## Column Mapping

When uploading a CSV, you can map source columns to target fields:

1. **Auto-mapping**: The system attempts to auto-detect column mappings
2. **Manual mapping**: Use the wizard to manually map columns
3. **Transformations**: Apply transformations like trim, lowercase, date parsing

### Available Transformations

| Transform | Description |
|-----------|-------------|
| `none` | No transformation |
| `trim` | Remove leading/trailing whitespace |
| `lowercase` | Convert to lowercase |
| `uppercase` | Convert to uppercase |
| `number` | Parse as number |
| `boolean` | Parse as boolean |
| `date` | Parse as date |

## Upload Workflow

### 1. Start Upload

```bash
POST /uploads/csv/start
{
  "type": "csv",
  "fileName": "customers.csv",
  "contentType": "text/csv",
  "entityType": "customer",
  "displayName": "Q1 Customer Import"
}
```

Response:
```json
{
  "uploadId": "upl_abc123",
  "fileId": "uplf_def456",
  "presignedUrl": "https://s3.../uploads/...",
  "s3Key": "uploads/tenant_id/upl_abc123/customers.csv"
}
```

### 2. Upload File

Upload the file to the presigned URL using PUT:

```bash
curl -X PUT -T customers.csv \
  -H "Content-Type: text/csv" \
  "https://s3.../uploads/..."
```

### 3. Complete Upload

```bash
POST /uploads/csv/complete
{
  "uploadId": "upl_abc123",
  "mapping": {
    "entityType": "customer",
    "columns": [
      { "sourceColumn": "ID", "targetField": "external_id" },
      { "sourceColumn": "Company", "targetField": "name" }
    ],
    "skipHeaderRow": true
  },
  "autoProcess": true
}
```

### 4. Check Status

```bash
GET /uploads/upl_abc123
```

Response:
```json
{
  "id": "upl_abc123",
  "status": "completed",
  "totalRows": 100,
  "validRows": 95,
  "errorCount": 5
}
```

## Error Handling

### Parse Errors

When rows fail validation, errors are recorded:

```json
{
  "rowNumber": 5,
  "field": "email",
  "errorType": "invalid_email",
  "errorMessage": "Invalid email format",
  "rawValue": "not-an-email"
}
```

### Reprocessing

Failed uploads can be reprocessed:

```bash
POST /uploads/upl_abc123/reprocess
```

This creates a new parse run with incremented `run_number`.

## API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/uploads/csv/start` | Get presigned URL for CSV upload |
| `POST` | `/uploads/csv/complete` | Complete CSV upload and start processing |
| `POST` | `/uploads/pdf/start` | Get presigned URL for PDF upload |
| `POST` | `/uploads/pdf/complete` | Complete PDF upload and start processing |
| `GET` | `/uploads` | List all uploads |
| `GET` | `/uploads/:id` | Get upload details |
| `GET` | `/uploads/:id/errors` | Get parse errors (paginated) |
| `DELETE` | `/uploads/:id` | Delete upload and files |
| `POST` | `/uploads/:id/reprocess` | Reprocess failed upload |
| `GET` | `/uploads/templates` | Get CSV template definitions |

## Best Practices

1. **Validate data before upload**: Check for required fields and data types
2. **Use consistent identifiers**: Ensure `external_id` values are unique
3. **Test with small files first**: Verify mapping works before uploading large files
4. **Review errors promptly**: Address parse errors and reprocess if needed
5. **Use templates**: Download templates for correct column headers

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required field` | Required column is empty | Ensure all required fields have values |
| `Invalid email format` | Email doesn't match pattern | Fix email format or leave empty |
| `Invalid date format` | Date not in YYYY-MM-DD | Convert dates to ISO format |
| `Duplicate external_id` | Same ID appears twice | Remove duplicates from CSV |

### Checking Logs

Upload processing logs are available in the worker console:

```
[upload-csv-parse] Starting parse for upl_abc123
[upload-csv-parse] Parsed 100 rows: 95 valid, 5 errors
```
