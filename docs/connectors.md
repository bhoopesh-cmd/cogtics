# Cogtics Connector Framework

## Overview

The connector framework provides a standardized way to integrate external data sources (Stripe, Salesforce, etc.) with Cogtics. It handles OAuth authentication, schema discovery, incremental sync, and secure credential storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         API Server                          │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────┐ │
│  │ OAuth Routes   │  │ Connection    │  │ Connectors     │ │
│  │ /start         │  │ Routes        │  │ Plugin         │ │
│  │ /callback      │  │ /sync         │  │                │ │
│  └────────────────┘  └───────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    packages/connectors                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ Stripe     │  │ Salesforce │  │ Base                   │ │
│  │ Connector  │  │ Connector  │  │ - HTTP Client          │ │
│  │            │  │            │  │ - Encryption           │ │
│  │            │  │            │  │ - OAuth                │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         Worker                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Sync Processor                                        │   │
│  │ - Load connection + credentials                       │   │
│  │ - Decrypt tokens                                      │   │
│  │ - Call connector.syncObject()                         │   │
│  │ - Write JSONL batches to S3                          │   │
│  │ - Update cursors for incremental sync                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### connections

Stores connection metadata for each tenant's external integrations.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) | Primary key (e.g., `conn_abc123`) |
| tenant_id | VARCHAR(64) | Owner tenant |
| provider | VARCHAR(50) | `stripe` or `salesforce` |
| status | VARCHAR(20) | `pending`, `connected`, `error`, `disconnected` |
| display_name | VARCHAR(255) | User-friendly name |
| last_sync_at | TIMESTAMPTZ | Last successful sync |
| last_error_message | TEXT | Most recent error |

### connection_credentials

Stores encrypted OAuth tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) | Primary key |
| connection_id | VARCHAR(64) | FK to connections |
| access_token_enc | TEXT | AES-256-GCM encrypted access token |
| refresh_token_enc | TEXT | Encrypted refresh token |
| expires_at | TIMESTAMPTZ | Token expiration |
| instance_url | VARCHAR(512) | Salesforce instance URL |

### connector_schemas

Stores discovered object schemas.

| Column | Type | Description |
|--------|------|-------------|
| connection_id | VARCHAR(64) | FK to connections |
| object_type | VARCHAR(100) | e.g., `customers`, `Account` |
| schema_json | JSONB | Field definitions |
| discovered_at | TIMESTAMPTZ | When schema was discovered |

### connector_cursors

Tracks sync progress for incremental sync.

| Column | Type | Description |
|--------|------|-------------|
| connection_id | VARCHAR(64) | FK to connections |
| object_type | VARCHAR(100) | Object type |
| cursor_json | JSONB | Cursor state (e.g., `{lastId, since}`) |

### connector_runs

Audit log of sync runs.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) | Primary key |
| connection_id | VARCHAR(64) | FK to connections |
| run_type | VARCHAR(20) | `full` or `incremental` |
| status | VARCHAR(20) | `running`, `completed`, `failed` |
| records_fetched | INTEGER | Total records synced |

### raw_batches

Tracks raw data batches stored in S3.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(64) | Primary key |
| run_id | VARCHAR(64) | FK to connector_runs |
| object_type | VARCHAR(100) | Object type |
| s3_key | VARCHAR(1024) | S3 object key |
| record_count | INTEGER | Records in batch |
| checksum | VARCHAR(64) | SHA-256 checksum |

## API Endpoints

### List Connections

```http
GET /connections
x-tenant-id: tenant_01
x-user-id: user_01

Response:
{
  "connections": [
    {
      "id": "conn_abc123",
      "provider": "stripe",
      "status": "connected",
      "displayName": "Stripe Production",
      "lastSyncAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### Start OAuth Flow

```http
POST /connections/stripe/start
x-tenant-id: tenant_01
x-user-id: user_01

Response:
{
  "authUrl": "https://connect.stripe.com/oauth/authorize?client_id=...",
  "state": "abc123..."
}
```

### Complete OAuth Callback

```http
POST /connections/stripe/callback
x-tenant-id: tenant_01
x-user-id: user_01
Content-Type: application/json

{
  "code": "ac_xxx",
  "state": "abc123...",
  "displayName": "Stripe Production"
}

Response:
{
  "connectionId": "conn_abc123",
  "status": "connected",
  "externalAccountId": "acct_xxx"
}
```

### Discover Schema

```http
POST /connections/:id/discover
x-tenant-id: tenant_01
x-user-id: user_01

Response:
{
  "connectionId": "conn_abc123",
  "provider": "stripe",
  "objectCount": 7,
  "discoveredAt": "2024-01-15T10:35:00Z"
}
```

### Trigger Sync

```http
POST /connections/:id/sync
x-tenant-id: tenant_01
x-user-id: user_01
Content-Type: application/json

{
  "runType": "incremental",
  "objectTypes": ["customers", "subscriptions"]
}

Response:
{
  "runId": "run_xyz789",
  "jobId": "job_def456",
  "status": "running"
}
```

### Health Check

```http
POST /connections/:id/health
x-tenant-id: tenant_01
x-user-id: user_01

Response:
{
  "healthy": true,
  "checkedAt": "2024-01-15T10:40:00Z",
  "externalAccountId": "acct_xxx"
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | `a1b2c3d4...` (64 chars) |
| `TOKEN_ENCRYPTION_MODE` | `local` or `kms` | `local` |
| `STRIPE_CLIENT_ID` | Stripe Connect client ID | `ca_xxx` |
| `STRIPE_CLIENT_SECRET` | Stripe Connect secret | `sk_xxx` |
| `SALESFORCE_CLIENT_ID` | Salesforce Connected App ID | `3MVG9...` |
| `SALESFORCE_CLIENT_SECRET` | Salesforce Connected App secret | `xxx` |
| `SALESFORCE_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/connections/salesforce/callback` |

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Connector Interface

All connectors implement the `Connector` interface:

```typescript
interface Connector {
  readonly provider: ConnectorProvider;
  
  // OAuth flow
  getAuthUrl(config: OAuthConfig): string;
  exchangeCode(code: string, config: OAuthConfig): Promise<TokenResponse>;
  refreshToken(refreshToken: string, config: OAuthConfig): Promise<TokenResponse>;
  
  // Schema discovery
  discoverSchema(credentials: Credentials): Promise<SchemaDefinition>;
  
  // Data sync (yields batches)
  syncObject(params: SyncParams): AsyncGenerator<RawBatch>;
  
  // Health check
  healthCheck(credentials: Credentials): Promise<HealthResult>;
}
```

## Adding a New Connector

1. Create a new directory in `packages/connectors/src/`:

```
packages/connectors/src/myconnector/
├── index.ts      # Main connector class
├── auth.ts       # OAuth implementation
├── schema.ts     # Schema definition
└── sync.ts       # Sync logic (if separate)
```

2. Implement the `Connector` interface:

```typescript
import type { Connector, ConnectorProvider } from '../types.js';

export class MyConnector implements Connector {
  readonly provider: ConnectorProvider = 'myconnector' as any;
  
  // Implement all required methods...
}
```

3. Register in `packages/connectors/src/registry.ts`:

```typescript
import { MyConnector } from './myconnector/index.js';
registerConnector(new MyConnector());
```

4. Add provider to schemas:

```typescript
// packages/schemas/src/connectors.ts
export const ConnectorProviderSchema = z.enum(['stripe', 'salesforce', 'myconnector']);
```

5. Add environment variables to `packages/schemas/src/env.ts`.

## Security

### Token Encryption

All OAuth tokens are encrypted at rest using AES-256-GCM:

- **IV**: Random 16 bytes per encryption
- **Auth Tag**: 16 bytes for authentication
- **Format**: `iv:authTag:ciphertext` (all base64)

### Row Level Security

All connector tables have RLS policies that scope access to the current tenant:

```sql
CREATE POLICY connections_tenant_isolation ON connections
    USING (tenant_id = current_setting('app.tenant_id', true));
```

### Permissions

All connection endpoints require the `integrations.manage` permission.

## Data Flow

### Sync Flow

```
1. User triggers POST /connections/:id/sync
2. API creates connector_run record with status=running
3. API enqueues BullMQ job
4. Worker picks up job:
   a. Load connection + encrypted credentials
   b. Decrypt tokens
   c. For each object_type:
      i.   Load cursor from connector_cursors
      ii.  Call connector.syncObject() 
      iii. Write JSONL batches to S3 (raw/{tenant}/{connection}/{object}/{run}/)
      iv.  Insert raw_batches record
      v.   Update cursor
   d. Update connector_run status=completed
   e. Update connection.last_sync_at
5. Job result stored in jobs table
```

### S3 Storage Structure

```
{bucket}/
└── raw/
    └── {tenant_id}/
        └── {connection_id}/
            └── {object_type}/
                └── {run_id}/
                    ├── batch_abc123.jsonl
                    ├── batch_def456.jsonl
                    └── ...
```

Each JSONL file contains one record per line in the format:
```json
{"id":"cus_xxx","email":"user@example.com","created":1704067200,...}
{"id":"cus_yyy","email":"other@example.com","created":1704153600,...}
```

## Stripe Connector

### Supported Objects

- `customers`
- `subscriptions`
- `invoices`
- `charges`
- `refunds`
- `products`
- `prices`

### Incremental Sync

Uses `created[gte]` filter with `starting_after` cursor for pagination.

### OAuth Setup

1. Create a Stripe Connect application at https://dashboard.stripe.com/settings/connect
2. Set redirect URI to `http://localhost:3000/connections/stripe/callback`
3. Copy Client ID and Secret to environment variables

## Salesforce Connector

### Supported Objects

- `Account`
- `Contact`
- `Opportunity`
- `OpportunityLineItem`
- `Lead`
- `Contract`
- `User`
- `Product2`
- `PricebookEntry`

### Incremental Sync

Uses SOQL query with `LastModifiedDate > :cursor` and `nextRecordsUrl` for pagination.

### OAuth Setup

1. Create a Connected App in Salesforce Setup
2. Enable OAuth Settings
3. Select scopes: `api`, `refresh_token`
4. Set callback URL to `http://localhost:3000/connections/salesforce/callback`
5. Copy Consumer Key (Client ID) and Consumer Secret to environment variables

