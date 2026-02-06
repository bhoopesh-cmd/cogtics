/**
 * HubSpot Data Mappers
 *
 * Maps HubSpot API responses to canonical model structures.
 */
export interface HubSpotCompany {
    id: string;
    properties: {
        name?: string;
        domain?: string;
        industry?: string;
        phone?: string;
        city?: string;
        state?: string;
        country?: string;
        annualrevenue?: string;
        numberofemployees?: string;
        hs_lastmodifieddate?: string;
        createdate?: string;
    };
}
export interface HubSpotContact {
    id: string;
    properties: {
        email?: string;
        firstname?: string;
        lastname?: string;
        phone?: string;
        company?: string;
        jobtitle?: string;
        lifecyclestage?: string;
        lastmodifieddate?: string;
        createdate?: string;
    };
}
export interface HubSpotDeal {
    id: string;
    properties: {
        dealname?: string;
        amount?: string;
        dealstage?: string;
        pipeline?: string;
        closedate?: string;
        hs_lastmodifieddate?: string;
        createdate?: string;
    };
}
/**
 * Map HubSpot company to canonical customer structure
 */
export declare function mapCompanyToCustomer(company: HubSpotCompany): Record<string, unknown>;
/**
 * Map HubSpot deal to canonical contract structure
 */
export declare function mapDealToContract(deal: HubSpotDeal): Record<string, unknown>;
//# sourceMappingURL=mappers.d.ts.map