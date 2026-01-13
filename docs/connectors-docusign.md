# DocuSign Connector

This document describes the DocuSign integration for syncing contract signature data.

## Overview

The DocuSign connector provides OAuth 2.0 authentication for:

- Envelopes (signature requests)
- Documents (attached files)
- Recipients (signers, carbon copies)

## Authentication

### OAuth 2.0 Flow

1. **Initiate OAuth**: Redirect to DocuSign authorization
2. **User Authorization**: User grants access
3. **Token Exchange**: Get access/refresh tokens
4. **Get User Info**: Retrieve account ID and base URI
5. **Token Refresh**: Before expiration

### Required Scopes

```
signature
extended
```

## Configuration

### Environment Variables

```env
DOCUSIGN_CLIENT_ID=your-integration-key
DOCUSIGN_CLIENT_SECRET=your-secret-key
DOCUSIGN_REDIRECT_URI=https://your-app.com/connections/docusign/callback
```

### OAuth Setup in DocuSign

1. Go to [DocuSign Admin](https://admin.docusign.com/)
2. Navigate to Integrations > Apps and Keys
3. Create an integration key
4. Add your redirect URI
5. Copy integration key and secret

## Object Mappings

### Envelope → Contract

| DocuSign Field | Canonical Field | Notes |
|----------------|-----------------|-------|
| `envelopeId` | `external_id` | Primary identifier |
| `emailSubject` | `name` | Subject line becomes name |
| `status` | `status` | Mapped to canonical status |
| `completedDateTime` | `signed_date` | When fully signed |
| `sentDateTime` | `sent_date` | When sent |
| `recipients.signers` | `metadata.signer_count` | Number of signers |
| `documents` | `metadata.document_count` | Number of documents |

### Envelope Status Mapping

| DocuSign Status | Canonical Status |
|-----------------|------------------|
| `completed`, `signed` | `active` |
| `sent`, `delivered` | `pending` |
| `voided`, `declined` | `cancelled` |
| Other | `draft` |

## Sync Behavior

### Envelope Listing

The connector fetches envelopes with:

- Incremental sync via `statusChangedDateTime`
- Include recipients and documents
- Default: last 30 days for full sync

### Rate Limits

DocuSign enforces **1000 requests per hour**.

The connector handles this with:
- Exponential backoff (up to 60s)
- Respects retry headers
- Maximum 5 retries

### Pagination

- Uses `start_position` and `count` parameters
- Follows `nextUri` for additional pages
- Default batch size: 100 envelopes

## API Reference

### Start OAuth

```bash
POST /connections/docusign/start
```

Response:
```json
{
  "authUrl": "https://account.docusign.com/oauth/auth?...",
  "state": "random-state-value"
}
```

### OAuth Callback

```bash
POST /connections/docusign/callback
{
  "code": "authorization-code",
  "state": "random-state-value"
}
```

The callback automatically:
1. Exchanges code for tokens
2. Calls `/userinfo` to get account details
3. Stores account ID and base URI

### Health Check

```bash
GET /connections/:connectionId/health
```

Returns account info:
```json
{
  "healthy": true,
  "message": "Connected to DocuSign",
  "externalAccountId": "abc-123-def",
  "details": {
    "accountName": "Acme Inc",
    "plan": "Business Pro"
  }
}
```

## Data Available

### Envelope Data

Each synced envelope includes:

- Envelope status and dates
- Email subject and message
- Sender information
- List of documents with names
- List of recipients with status

### Document Content

Documents can be downloaded separately:

```bash
GET /envelopes/:envelopeId/documents/:documentId
```

Returns the PDF content.

## Use Cases

### Contract Intelligence

Synced envelopes provide:

1. **Signature Status**: Track which contracts are pending
2. **Completion Dates**: Know when contracts were signed
3. **Signer Information**: Who signed and when
4. **Document Inventory**: What documents are attached

### Workflow Integration

Common patterns:

- Alert when envelope is completed
- Link DocuSign contracts to customers
- Track pending signatures
- Archive signed documents

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Token expired | Refresh token |
| `Account ID missing` | Not retrieved | Re-authenticate |
| `Base URI missing` | Not retrieved | Re-authenticate |
| `No envelopes found` | Date range | Check from_date |

### Debug Logging

Enable debug logging:

```env
LOG_LEVEL=debug
```

Logs include:
- OAuth flow events
- API request/response
- Envelope counts
