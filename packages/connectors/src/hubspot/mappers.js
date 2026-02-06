/**
 * HubSpot Data Mappers
 *
 * Maps HubSpot API responses to canonical model structures.
 */
/**
 * Map HubSpot company to canonical customer structure
 */
export function mapCompanyToCustomer(company) {
    return {
        external_id: company.id,
        name: company.properties.name ?? `Company ${company.id}`,
        email: null, // Companies don't have direct email in HubSpot
        phone: company.properties.phone ?? null,
        billing_address: formatAddress(company.properties),
        status: 'active',
        metadata: {
            source: 'hubspot',
            domain: company.properties.domain,
            industry: company.properties.industry,
            annual_revenue: company.properties.annualrevenue ? parseFloat(company.properties.annualrevenue) : null,
            employee_count: company.properties.numberofemployees ? parseInt(company.properties.numberofemployees) : null,
        },
    };
}
/**
 * Map HubSpot deal to canonical contract structure
 */
export function mapDealToContract(deal) {
    return {
        external_id: deal.id,
        name: deal.properties.dealname ?? `Deal ${deal.id}`,
        status: mapDealStageToStatus(deal.properties.dealstage),
        value: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
        start_date: deal.properties.createdate ? new Date(deal.properties.createdate) : null,
        end_date: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
        metadata: {
            source: 'hubspot',
            pipeline: deal.properties.pipeline,
            stage: deal.properties.dealstage,
        },
    };
}
function formatAddress(props) {
    const parts = [props.city, props.state, props.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
}
function mapDealStageToStatus(stage) {
    if (!stage)
        return 'draft';
    const lowerStage = stage.toLowerCase();
    if (lowerStage.includes('closed') && lowerStage.includes('won'))
        return 'active';
    if (lowerStage.includes('closed') && lowerStage.includes('lost'))
        return 'cancelled';
    if (lowerStage.includes('contract'))
        return 'pending';
    return 'draft';
}
//# sourceMappingURL=mappers.js.map