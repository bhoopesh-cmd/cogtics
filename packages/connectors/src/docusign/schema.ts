/**
 * DocuSign Schema Definitions
 */
import type { SchemaDefinition, SchemaObject } from '../types.js';

export const DOCUSIGN_OBJECTS: SchemaObject[] = [
  {
    name: 'envelopes',
    label: 'Envelopes',
    supportsIncremental: true,
    incrementalField: 'statusChangedDateTime',
    fields: [
      { name: 'envelopeId', type: 'string', required: true, label: 'Envelope ID' },
      { name: 'status', type: 'string', required: true, label: 'Status' },
      { name: 'emailSubject', type: 'string', required: false, label: 'Email Subject' },
      { name: 'sentDateTime', type: 'datetime', required: false, label: 'Sent Date' },
      { name: 'completedDateTime', type: 'datetime', required: false, label: 'Completed Date' },
      { name: 'statusChangedDateTime', type: 'datetime', required: false, label: 'Status Changed' },
      { name: 'createdDateTime', type: 'datetime', required: false, label: 'Created Date' },
    ],
  },
  {
    name: 'documents',
    label: 'Documents',
    supportsIncremental: false,
    fields: [
      { name: 'documentId', type: 'string', required: true, label: 'Document ID' },
      { name: 'name', type: 'string', required: true, label: 'Document Name' },
      { name: 'type', type: 'string', required: false, label: 'Document Type' },
      { name: 'uri', type: 'string', required: false, label: 'Document URI' },
      { name: 'order', type: 'number', required: false, label: 'Order' },
    ],
  },
  {
    name: 'recipients',
    label: 'Recipients',
    supportsIncremental: false,
    fields: [
      { name: 'recipientId', type: 'string', required: true, label: 'Recipient ID' },
      { name: 'recipientType', type: 'string', required: true, label: 'Recipient Type' },
      { name: 'email', type: 'string', required: true, label: 'Email' },
      { name: 'name', type: 'string', required: false, label: 'Name' },
      { name: 'status', type: 'string', required: false, label: 'Status' },
      { name: 'signedDateTime', type: 'datetime', required: false, label: 'Signed Date' },
      { name: 'deliveredDateTime', type: 'datetime', required: false, label: 'Delivered Date' },
    ],
  },
];

export function getDocuSignSchema(): SchemaDefinition {
  return {
    provider: 'docusign' as any,
    objects: DOCUSIGN_OBJECTS,
    discoveredAt: new Date(),
  };
}

// Envelope statuses
export const ENVELOPE_STATUSES = [
  'created',
  'sent',
  'delivered',
  'signed',
  'completed',
  'declined',
  'voided',
] as const;
