# QuickBooks Connector

This document describes the QuickBooks Online integration for syncing accounting data.

## Overview

The QuickBooks connector provides OAuth 2.0 authentication (with PKCE support) for:

- Customers
- Invoices
- Payments
- Items (Products/Services)
- Accounts (Chart of Accounts)
- Terms (Payment Terms)

## Authentication

### OAuth 2.0 with PKCE

Intuit recommends PKCE for enhanced security:

1. **Generate code verifier and challenge**
2. **Initiate OAuth** with code challenge
3. **User Authorization** in QuickBooks
4. **Token Exchange** with code verifier
5. **Token Refresh** before expiration

### Required Scopes

```
com.intuit.quickbooks.accounting
```

## Configuration

### Environment Variables

```env
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REDIRECT_URI=https://your-app.com/connections/quickbooks/callback
QUICKBOOKS_SANDBOX=false  # Set to true for sandbox
```

### OAuth Setup in Intuit Developer Portal

1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create an app
3. Configure OAuth settings
4. Add your redirect URI
5. Copy client ID and secret

## Object Mappings

### Customer → Customer

| QuickBooks Field | Canonical Field | Notes |
|------------------|-----------------|-------|
| `Id` | `external_id` | Primary identifier |
| `CompanyName` or `DisplayName` | `name` | Prefers company name |
| `PrimaryEmailAddr.Address` | `email` | Email address |
| `PrimaryPhone.FreeFormNumber` | `phone` | Phone number |
| `BillAddr.*` | `billing_address` | Concatenated address |
| `Active` | `status` | Maps to active/inactive |

### Invoice → Invoice

| QuickBooks Field | Canonical Field | Notes |
|------------------|-----------------|-------|
| `Id` | `external_id` | Primary identifier |
| `DocNumber` | `invoice_number` | Invoice number |
| `CustomerRef.value` | `customer_external_id` | Customer reference |
| `TxnDate` | `invoice_date` | Transaction date |
| `DueDate` | `due_date` | Due date |
| `TotalAmt` | `total` | Total amount |
| `Balance` | `amount_due` | Balance due |
| `CurrencyRef.value` | `currency` | Currency code |

### Invoice Status Mapping

| Balance Condition | Canonical Status |
|-------------------|------------------|
| Balance = 0 | `paid` |
| Balance < Total | `partial` |
| Balance = Total | `open` |

## Sync Behavior

### Query Language

QuickBooks uses SQL-like queries:

```sql
SELECT * FROM Customer 
WHERE MetaData.LastUpdatedTime > '2024-01-01T00:00:00Z'
STARTPOSITION 1 MAXRESULTS 100
```

### Incremental Sync

Uses `MetaData.LastUpdatedTime` for incremental queries:

- Filters records by last modified time
- Reduces data transfer
- Faster sync cycles

### Rate Limits

QuickBooks enforces **500 requests per minute**.

The connector handles this with:
- Exponential backoff
- Respects retry headers
- Maximum 5 retries

### Sandbox vs Production

Use sandbox for testing:

```env
QUICKBOOKS_SANDBOX=true
```

Sandbox URL: `sandbox-quickbooks.api.intuit.com`
Production URL: `quickbooks.api.intuit.com`

## API Reference

### Start OAuth

```bash
POST /connections/quickbooks/start
{
  "codeChallenge": "base64-encoded-challenge",
  "codeChallengeMethod": "S256"
}
```

### OAuth Callback

```bash
POST /connections/quickbooks/callback
{
  "code": "authorization-code",
  "state": "random-state-value",
  "realmId": "company-id",
  "codeVerifier": "original-verifier"
}
```

### Health Check

```bash
GET /connections/:connectionId/health
```

Returns company info:
```json
{
  "healthy": true,
  "message": "Connected to QuickBooks",
  "externalAccountId": "1234567890",
  "details": {
    "companyName": "Acme Inc",
    "country": "US"
  }
}
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Token expired | Refresh token |
| `403 Forbidden` | Wrong company | Check realmId |
| `400 Bad Request` | Invalid query | Check SQL syntax |
| `Realm ID missing` | Not stored | Re-authenticate |

### Debug Logging

Enable debug logging:

```env
LOG_LEVEL=debug
```
