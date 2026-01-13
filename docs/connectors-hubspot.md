# HubSpot Connector

This document describes the HubSpot integration for syncing CRM and marketing data.

## Overview

The HubSpot connector provides OAuth 2.0 authentication and data synchronization for:

- Companies (mapped to Customers)
- Contacts
- Deals (mapped to Contracts)
- Line Items
- Products
- Owners

## Authentication

### OAuth 2.0 Flow

1. **Initiate OAuth**: Redirect user to HubSpot authorization URL
2. **User Authorization**: User grants access to your HubSpot portal
3. **Token Exchange**: Exchange authorization code for access/refresh tokens
4. **Token Refresh**: Automatically refresh tokens before expiration

### Required Scopes

```
crm.objects.companies.read
crm.objects.contacts.read
crm.objects.deals.read
crm.objects.line_items.read
crm.schemas.deals.read
crm.schemas.contacts.read
crm.schemas.companies.read
```

## Configuration

### Environment Variables

```env
HUBSPOT_CLIENT_ID=your-client-id
HUBSPOT_CLIENT_SECRET=your-client-secret
HUBSPOT_REDIRECT_URI=https://your-app.com/connections/hubspot/callback
```

### OAuth Setup in HubSpot

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create or select an app
3. Configure OAuth settings
4. Add your redirect URI
5. Copy client ID and secret

## Object Mappings

### Companies → Customers

| HubSpot Field | Canonical Field | Notes |
|---------------|-----------------|-------|
| `hs_object_id` | `external_id` | Primary identifier |
| `name` | `name` | Company name |
| `phone` | `phone` | Primary phone |
| `domain` | `metadata.domain` | Website domain |
| `industry` | `metadata.industry` | Industry category |
| `annualrevenue` | `metadata.annual_revenue` | Parsed as number |
| `city`, `state`, `country` | `billing_address` | Concatenated |

### Deals → Contracts

| HubSpot Field | Canonical Field | Notes |
|---------------|-----------------|-------|
| `hs_object_id` | `external_id` | Primary identifier |
| `dealname` | `name` | Deal name |
| `amount` | `value` | Parsed as number |
| `dealstage` | `status` | Mapped to: active/pending/cancelled/draft |
| `closedate` | `end_date` | Close date |
| `pipeline` | `metadata.pipeline` | Pipeline name |

### Deal Stage Mapping

| HubSpot Stage | Canonical Status |
|---------------|------------------|
| Contains "closedwon" | `active` |
| Contains "closedlost" | `cancelled` |
| Contains "contract" | `pending` |
| Other | `draft` |

## Sync Behavior

### Incremental Sync

The connector supports incremental sync using `hs_lastmodifieddate`:

- Only fetches records modified since last sync
- Uses HubSpot Search API for filtered queries
- Reduces API calls and sync time

### Rate Limits

HubSpot enforces rate limits of **100 requests per 10 seconds**.

The connector handles this with:
- Exponential backoff on 429 responses
- Respects `Retry-After` header
- Maximum 5 retries per request

### Pagination

- Default batch size: 100 records
- Maximum supported by API: 100 records per request
- Uses cursor-based pagination (`after` parameter)

## API Reference

### Start OAuth

```bash
POST /connections/hubspot/start
```

Response:
```json
{
  "authUrl": "https://app.hubspot.com/oauth/authorize?...",
  "state": "random-state-value"
}
```

### OAuth Callback

```bash
POST /connections/hubspot/callback
{
  "code": "authorization-code",
  "state": "random-state-value"
}
```

### Health Check

```bash
GET /connections/:connectionId/health
```

Returns HubSpot account info:
```json
{
  "healthy": true,
  "message": "Connected to HubSpot",
  "externalAccountId": "12345678",
  "details": {
    "timeZone": "America/New_York",
    "currency": "USD"
  }
}
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Token expired | Refresh token or re-authenticate |
| `403 Forbidden` | Missing scope | Check OAuth scopes |
| `429 Too Many Requests` | Rate limited | Wait and retry |
| `ECONNREFUSED` | Network issue | Check connectivity |

### Debug Logging

Enable debug logging:

```env
LOG_LEVEL=debug
```

Logs include:
- OAuth flow events
- API request/response details
- Rate limit information
