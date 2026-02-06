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
export declare function mapEnvelopeToContract(envelope: DocuSignEnvelope): Record<string, unknown>;
//# sourceMappingURL=mappers.d.ts.map