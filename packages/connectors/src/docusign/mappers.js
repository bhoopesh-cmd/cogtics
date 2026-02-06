/**
 * DocuSign Data Mappers
 */
/**
 * Map DocuSign envelope to contract metadata
 */
export function mapEnvelopeToContract(envelope) {
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
function mapEnvelopeStatus(status) {
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
//# sourceMappingURL=mappers.js.map