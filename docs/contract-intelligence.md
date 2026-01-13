# Contract Intelligence

Phase 5 of Cogtics introduces contract intelligence capabilities for extracting structured data from contract documents. This system processes PDF contracts to identify clauses, extract key terms with confidence scores, and determine contract readiness for downstream operations.

## Overview

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│  PDF Upload     │────▶│  Text Extraction  │────▶│  Clause         │
│  (Phase 4)      │     │  (pdf-parse)      │     │  Segmentation   │
└─────────────────┘     └───────────────────┘     └────────┬────────┘
                                                           │
                        ┌───────────────────┐     ┌────────▼────────┐
                        │  Readiness        │◀────│  Term           │
                        │  Computation      │     │  Extraction     │
                        └────────┬──────────┘     └─────────────────┘
                                 │
                        ┌────────▼──────────┐
                        │  Override         │
                        │  Workflow         │
                        └───────────────────┘
```

## Architecture

### Data Flow

1. **PDF Upload**: User uploads a contract PDF via the manual upload feature (Phase 4)
2. **Text Extraction**: Worker extracts text content from PDF using `pdf-parse`
3. **Clause Segmentation**: Text is segmented into structural clauses (headings, sections, paragraphs, list items)
4. **Term Extraction**: Pattern-based extraction identifies key contract terms
5. **Readiness Computation**: System evaluates if the contract has sufficient terms for use
6. **Override Workflow**: Users can manually correct or verify extracted terms

### Database Tables

| Table | Purpose |
|-------|---------|
| `contract_documents` | Links PDFs to contracts with extraction status |
| `contract_clauses` | Extracted clause segments with offsets and types |
| `contract_terms` | Extracted terms with confidence scores (extended from Phase 2) |
| `contract_term_overrides` | User corrections to extracted values |
| `contract_readiness` | Readiness status per contract version |

## Supported Term Types

| Term Type | Description | Example Patterns |
|-----------|-------------|------------------|
| `pricing_model` | How pricing is structured | "per user", "flat fee", "usage-based" |
| `billing_cadence` | Payment frequency | "monthly", "quarterly", "annually" |
| `contract_value` | Total monetary value | "$50,000", "annual value" |
| `payment_terms` | Payment due dates | "net 30", "due on receipt" |
| `term_length` | Duration of agreement | "3 years", "12 months" |
| `start_date` | Effective date | "January 1, 2024" |
| `end_date` | Termination date | "expires December 31" |
| `auto_renew` | Automatic renewal | "automatically renew" |
| `renewal_terms` | Renewal period details | "successive one-year terms" |
| `notice_period` | Required notice for actions | "30 days prior notice" |
| `termination_terms` | Termination conditions | "terminate for cause" |
| `discount` | Price reductions | "20% discount" |
| `uplift` | Price increases | "5% annual increase" |
| `usage_caps` | Usage limits | "up to 100 users" |

## Confidence Scoring

Each extracted term includes a confidence score (0.0 - 1.0):

| Confidence | Interpretation | UI Indicator |
|------------|----------------|--------------|
| ≥ 0.80 | High confidence | Green |
| 0.50 - 0.79 | Medium confidence | Yellow |
| < 0.50 | Low confidence | Red |

Factors affecting confidence:
- **Match length**: Longer pattern matches increase confidence
- **Context**: Terms found in expected sections score higher
- **Clarity**: Explicit values (e.g., "$50,000") score higher than implied

## Readiness Status

Contracts are evaluated for "readiness" based on extracted terms:

| Status | Criteria |
|--------|----------|
| `ready` | All required terms present with high confidence |
| `needs_review` | Some terms missing or have low confidence |
| `incomplete` | Critical terms missing (3+ required terms) |

### Required Terms by Contract Type

**Default (Standard)**
- pricing_model
- billing_cadence
- contract_value
- start_date
- term_length

**Subscription**
- All default terms
- auto_renew

**Enterprise**
- All default terms
- payment_terms
- termination_terms

**SaaS**
- All default terms
- auto_renew
- usage_caps

## API Reference

### Get Contract Document

```
GET /contracts/:id/document
```

Returns document extraction status and metadata.

### Get Contract Clauses

```
GET /contracts/:id/clauses
GET /contracts/:id/clauses?type=heading
```

Returns extracted clauses, optionally filtered by type.

### Get Contract Terms

```
GET /contracts/:id/terms
GET /contracts/:id/terms?type=pricing_model&minConfidence=50
```

Returns extracted terms with confidence scores.

### Override Term Value

```
POST /contracts/:id/terms/:termId/override
{
  "overrideValue": { "model": "per_user" },
  "reason": "Corrected based on section 3.1"
}
```

Creates a manual override for an extracted term.

### Remove Term Override

```
DELETE /contracts/:id/terms/:termId/override
```

Removes a manual override, reverting to extracted value.

### Get Contract Readiness

```
GET /contracts/:id/readiness
```

Returns readiness status and missing/low-confidence terms.

### Mark as Reviewed

```
POST /contracts/:id/readiness/review
{
  "notes": "Verified by legal team"
}
```

Marks the contract as manually reviewed and ready.

### Reprocess Contract

```
POST /contracts/:id/reprocess
{
  "forceReextract": true
}
```

Triggers re-extraction of terms. Set `forceReextract: true` to re-extract text from PDF.

## Worker Jobs

| Queue | Description |
|-------|-------------|
| `contracts.pdf.extract` | Extracts text from PDF |
| `contracts.clause.segment` | Segments text into clauses |
| `contracts.terms.extract` | Extracts terms from clauses |
| `contracts.readiness.compute` | Computes readiness status |

Jobs are automatically chained: extraction → segmentation → term extraction → readiness.

## Override Workflow

1. Navigate to Contract Intelligence page
2. Select the "Terms" tab
3. Click the edit icon on any term
4. Enter the corrected value as JSON
5. Optionally provide a reason for the change
6. Save the override

Overridden terms:
- Display "[Overridden]" badge
- Show both original and corrected values
- Include audit trail (who, when, why)
- Can be removed to revert to extracted value

## UI Components

### Contract Intelligence Page

Main view accessible from Contract Detail page via "Intelligence" button. Includes:
- Document status header
- Tabs: Document, Clauses, Terms, Readiness
- Reprocess action

### Clauses Panel

- Hierarchical clause list
- Type filtering (heading, section, paragraph, list_item)
- Clause detail view with text content

### Terms Panel

- Term table with confidence indicators
- Filter by type and confidence
- Expand rows to see matched text and raw values
- Override button per term

### Readiness Panel

- Visual readiness status (ready/needs_review/incomplete)
- Confidence score display
- Missing terms list
- Low-confidence terms list
- "Mark as Reviewed" action

## Troubleshooting

### No Terms Extracted

1. Check document status is "extracted"
2. Verify PDF contains extractable text (not scanned image)
3. Try reprocessing with `forceReextract: true`

### Low Confidence Scores

1. Review matched text in term details
2. Consider manual override if extraction is incorrect
3. Check if contract uses unusual terminology

### Readiness Stuck on "Incomplete"

1. Review missing terms list
2. Upload additional contract documents
3. Use override workflow to add missing values
4. Mark as reviewed if business rules allow

### Extraction Errors

1. Check error message in document status
2. Verify PDF is not password-protected
3. Ensure PDF is not corrupted
4. Check worker logs for detailed errors

## Best Practices

1. **Review Before Use**: Always review extracted terms before downstream processing
2. **Document Overrides**: Provide clear reasons when overriding values
3. **Use Reprocess Sparingly**: Only reprocess when documents are updated
4. **Monitor Confidence**: Pay attention to low-confidence terms
5. **Verify Readiness**: Ensure contracts meet readiness requirements before revenue recognition
