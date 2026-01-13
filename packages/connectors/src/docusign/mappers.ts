/**
 * DocuSign Data Mappers
 */

export interface DocuSignEnvelope {
  envelopeId: string;
  status: string;
  emailSubject?: string;
  sentDateTime?: string;
  completedDateTime?: string;
  statusChangedDateTime?: string;
  createdDateTime?: string;
  recipients?: {
    signers?: DocuSignRecipient[];
    carbonCopies?: DocuSignRecipient[];
  };
  documents?: DocuSignDocument[];
}

export interface DocuSignRecipient {
  recipientId: string;
  recipientIdGuid?: string;
  email: string;
  name?: string;
  status?: string;
  signedDateTime?: string;
  deliveredDateTime?: string;
}

export interface DocuSignDocument {
  documentId: string;
  name: string;
  type?: string;
  uri?: string;
  order?: string;
}

/**
 * Map DocuSign envelope to contract metadata
 */
export function mapEnvelopeToContract(envelope: DocuSignEnvelope): Record<string, unknown> {
  return {
    external_id: envelope.envelopeId,
    name: envelope.emailSubject ?? `Contract ${envelope.envelopeId}`,
    status: mapEnvelopeStatus(envelope.status),
    signed_date: envelope.completedDateTime ?? null,
    sent_date: envelope.sentDateTime ?? null,
    created_date: envelope.createdDateTime ?? null,
    metadata: {
      source: 'docusign',
      envelope_status: envelope.status,
      signer_count: envelope.recipients?.signers?.length ?? 0,
      document_count: envelope.documents?.length ?? 0,
    },
  };
}

function mapEnvelopeStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'signed':
      return 'active';
    case 'sent':
    case 'delivered':
      return 'pending';
    case 'voided':
    case 'declined':
      return 'cancelled';
    default:
      return 'draft';
  }
}
