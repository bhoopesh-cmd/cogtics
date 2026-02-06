/**
 * Salesforce Mappers
 *
 * Pure functions that transform raw Salesforce API data into normalized shapes.
 * All mappers validate output with Zod and return validated results.
 */
import { NormalizedCustomerSchema, NormalizedContractSchema, NormalizedProductSchema, NormalizedPricePlanSchema, } from '@cogtics/schemas';
// ============================================
// Helper Functions
// ============================================
function createSourceInfo(batchId, recordId) {
    return {
        system: 'salesforce',
        batchId,
        recordId,
    };
}
function mapOpportunityStage(stageName, isClosed, isWon) {
    if (isClosed) {
        return isWon ? 'active' : 'cancelled';
    }
    const lowerStage = stageName.toLowerCase();
    if (lowerStage.includes('closed') && lowerStage.includes('won')) {
        return 'active';
    }
    if (lowerStage.includes('closed') || lowerStage.includes('lost')) {
        return 'cancelled';
    }
    if (lowerStage.includes('proposal') || lowerStage.includes('negotiation')) {
        return 'draft';
    }
    return 'draft';
}
function mapContractStatus(status) {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'activated' || lowerStatus === 'active') {
        return 'active';
    }
    if (lowerStatus === 'draft' || lowerStatus === 'in approval process') {
        return 'draft';
    }
    if (lowerStatus === 'expired') {
        return 'expired';
    }
    if (lowerStatus === 'terminated' || lowerStatus === 'cancelled') {
        return 'cancelled';
    }
    return 'active';
}
function parseDate(dateStr) {
    if (!dateStr)
        return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}
// ============================================
// Mapper Functions
// ============================================
export function mapSalesforceAccount(raw, batchId) {
    const normalized = {
        externalId: raw.Id,
        externalIds: { salesforce: raw.Id },
        name: raw.Name,
        email: null, // Accounts don't have email, contacts do
        status: raw.IsDeleted ? 'inactive' : 'active',
        metadata: {
            type: raw.Type,
            industry: raw.Industry,
            website: raw.Website,
            phone: raw.Phone,
            annualRevenue: raw.AnnualRevenue,
            numberOfEmployees: raw.NumberOfEmployees,
            description: raw.Description,
            billingAddress: {
                street: raw.BillingStreet,
                city: raw.BillingCity,
                state: raw.BillingState,
                postalCode: raw.BillingPostalCode,
                country: raw.BillingCountry,
            },
        },
        source: createSourceInfo(batchId, raw.Id),
    };
    return NormalizedCustomerSchema.parse(normalized);
}
export function mapSalesforceContact(raw, batchId) {
    const name = [raw.FirstName, raw.LastName].filter(Boolean).join(' ') || raw.Id;
    const normalized = {
        externalId: raw.Id,
        externalIds: { salesforce: raw.Id, salesforceAccountId: raw.AccountId || undefined },
        name,
        email: raw.Email || null,
        status: raw.IsDeleted ? 'inactive' : 'active',
        metadata: {
            firstName: raw.FirstName,
            lastName: raw.LastName,
            phone: raw.Phone,
            title: raw.Title,
            department: raw.Department,
            accountId: raw.AccountId,
        },
        source: createSourceInfo(batchId, raw.Id),
    };
    return NormalizedCustomerSchema.parse(normalized);
}
export function mapSalesforceOpportunity(raw, batchId) {
    const closeDate = parseDate(raw.CloseDate);
    const normalized = {
        externalId: raw.Id,
        externalIds: { salesforce: raw.Id },
        customerExternalId: raw.AccountId || null,
        name: raw.Name,
        status: mapOpportunityStage(raw.StageName, raw.IsClosed, raw.IsWon),
        startDate: closeDate,
        endDate: null, // Opportunities don't have end dates
        arr: raw.Amount || null,
        currency: 'USD', // Default, could be from CurrencyIsoCode if available
        billingFrequency: 'annually', // Default assumption for opportunities
        autoRenew: false,
        metadata: {
            stageName: raw.StageName,
            probability: raw.Probability,
            type: raw.Type,
            leadSource: raw.LeadSource,
            isClosed: raw.IsClosed,
            isWon: raw.IsWon,
            description: raw.Description,
        },
        source: createSourceInfo(batchId, raw.Id),
    };
    return NormalizedContractSchema.parse(normalized);
}
export function mapSalesforceContract(raw, batchId) {
    const startDate = parseDate(raw.StartDate);
    const endDate = parseDate(raw.EndDate);
    // Try to get ARR from custom fields or calculate from term
    let arr = raw.Annual_Contract_Value__c || null;
    if (!arr && raw.Total_Contract_Value__c && raw.ContractTerm) {
        arr = (raw.Total_Contract_Value__c / raw.ContractTerm) * 12;
    }
    const normalized = {
        externalId: raw.Id,
        externalIds: { salesforce: raw.Id },
        customerExternalId: raw.AccountId,
        name: raw.ContractNumber || `Contract ${raw.Id}`,
        status: mapContractStatus(raw.Status),
        startDate,
        endDate,
        arr,
        currency: 'USD',
        billingFrequency: 'monthly', // Default
        autoRenew: false,
        metadata: {
            contractNumber: raw.ContractNumber,
            contractTerm: raw.ContractTerm,
            ownerExpirationNotice: raw.OwnerExpirationNotice,
            description: raw.Description,
            totalContractValue: raw.Total_Contract_Value__c,
            billingAddress: {
                street: raw.BillingStreet,
                city: raw.BillingCity,
                state: raw.BillingState,
                postalCode: raw.BillingPostalCode,
                country: raw.BillingCountry,
            },
        },
        source: createSourceInfo(batchId, raw.Id),
    };
    return NormalizedContractSchema.parse(normalized);
}
export function mapSalesforceProduct(raw, batchId) {
    const normalized = {
        externalId: raw.Id,
        externalIds: { salesforce: raw.Id },
        sku: raw.ProductCode || null,
        name: raw.Name,
        description: raw.Description || null,
        category: raw.Family || null,
        status: raw.IsActive && !raw.IsDeleted ? 'active' : 'inactive',
        metadata: {},
        source: createSourceInfo(batchId, raw.Id),
    };
    return NormalizedProductSchema.parse(normalized);
}
export function mapSalesforcePricebookEntry(raw, batchId) {
    const normalized = {
        externalId: raw.Id,
        externalIds: { salesforce: raw.Id, pricebookId: raw.Pricebook2Id },
        productExternalId: raw.Product2Id,
        name: null,
        billingCadence: null,
        currency: raw.CurrencyIsoCode || 'USD',
        price: {
            type: 'flat',
            amount: raw.UnitPrice,
        },
        status: raw.IsActive && !raw.IsDeleted ? 'active' : 'inactive',
        metadata: {
            useStandardPrice: raw.UseStandardPrice,
        },
        source: createSourceInfo(batchId, raw.Id),
    };
    return NormalizedPricePlanSchema.parse(normalized);
}
export function mapSalesforceRecord(objectType, raw, batchId) {
    switch (objectType) {
        case 'Account':
            return mapSalesforceAccount(raw, batchId);
        case 'Contact':
            return mapSalesforceContact(raw, batchId);
        case 'Opportunity':
            return mapSalesforceOpportunity(raw, batchId);
        case 'Contract':
            return mapSalesforceContract(raw, batchId);
        case 'Product2':
            return mapSalesforceProduct(raw, batchId);
        case 'PricebookEntry':
            return mapSalesforcePricebookEntry(raw, batchId);
        default:
            throw new Error(`Unknown Salesforce object type: ${objectType}`);
    }
}
// Map Salesforce object types to canonical types
export const SALESFORCE_TO_CANONICAL_TYPE = {
    Account: 'customer',
    Contact: 'customer',
    Opportunity: 'contract',
    Contract: 'contract',
    Product2: 'product',
    PricebookEntry: 'pricePlan',
};
//# sourceMappingURL=mappers.js.map