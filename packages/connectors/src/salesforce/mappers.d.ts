/**
 * Salesforce Mappers
 *
 * Pure functions that transform raw Salesforce API data into normalized shapes.
 * All mappers validate output with Zod and return validated results.
 */
import { type NormalizedCustomer, type NormalizedContract, type NormalizedProduct, type NormalizedPricePlan } from '@cogtics/schemas';
interface SalesforceAccount {
    Id: string;
    Name: string;
    Type?: string | null;
    Industry?: string | null;
    Website?: string | null;
    Phone?: string | null;
    BillingStreet?: string | null;
    BillingCity?: string | null;
    BillingState?: string | null;
    BillingPostalCode?: string | null;
    BillingCountry?: string | null;
    Description?: string | null;
    AnnualRevenue?: number | null;
    NumberOfEmployees?: number | null;
    CreatedDate: string;
    LastModifiedDate: string;
    IsDeleted?: boolean;
    [key: string]: unknown;
}
interface SalesforceContact {
    Id: string;
    FirstName?: string | null;
    LastName: string;
    Email?: string | null;
    Phone?: string | null;
    AccountId?: string | null;
    Title?: string | null;
    Department?: string | null;
    CreatedDate: string;
    LastModifiedDate: string;
    IsDeleted?: boolean;
    [key: string]: unknown;
}
interface SalesforceOpportunity {
    Id: string;
    Name: string;
    AccountId?: string | null;
    StageName: string;
    Amount?: number | null;
    CloseDate: string;
    Probability?: number | null;
    Type?: string | null;
    LeadSource?: string | null;
    IsClosed: boolean;
    IsWon: boolean;
    Description?: string | null;
    CreatedDate: string;
    LastModifiedDate: string;
    IsDeleted?: boolean;
    [key: string]: unknown;
}
interface SalesforceContract {
    Id: string;
    AccountId: string;
    ContractNumber?: string | null;
    Status: string;
    StartDate?: string | null;
    EndDate?: string | null;
    ContractTerm?: number | null;
    OwnerExpirationNotice?: string | null;
    Description?: string | null;
    BillingStreet?: string | null;
    BillingCity?: string | null;
    BillingState?: string | null;
    BillingPostalCode?: string | null;
    BillingCountry?: string | null;
    CreatedDate: string;
    LastModifiedDate: string;
    IsDeleted?: boolean;
    Total_Contract_Value__c?: number | null;
    Annual_Contract_Value__c?: number | null;
    [key: string]: unknown;
}
interface SalesforceProduct {
    Id: string;
    Name: string;
    ProductCode?: string | null;
    Description?: string | null;
    IsActive: boolean;
    Family?: string | null;
    CreatedDate: string;
    LastModifiedDate: string;
    IsDeleted?: boolean;
    [key: string]: unknown;
}
interface SalesforcePricebookEntry {
    Id: string;
    Product2Id: string;
    Pricebook2Id: string;
    UnitPrice: number;
    IsActive: boolean;
    UseStandardPrice?: boolean;
    CurrencyIsoCode?: string;
    CreatedDate: string;
    LastModifiedDate: string;
    IsDeleted?: boolean;
    [key: string]: unknown;
}
export declare function mapSalesforceAccount(raw: SalesforceAccount, batchId?: string): NormalizedCustomer;
export declare function mapSalesforceContact(raw: SalesforceContact, batchId?: string): NormalizedCustomer;
export declare function mapSalesforceOpportunity(raw: SalesforceOpportunity, batchId?: string): NormalizedContract;
export declare function mapSalesforceContract(raw: SalesforceContract, batchId?: string): NormalizedContract;
export declare function mapSalesforceProduct(raw: SalesforceProduct, batchId?: string): NormalizedProduct;
export declare function mapSalesforcePricebookEntry(raw: SalesforcePricebookEntry, batchId?: string): NormalizedPricePlan;
export type SalesforceObjectType = 'Account' | 'Contact' | 'Opportunity' | 'Contract' | 'Product2' | 'PricebookEntry';
export declare function mapSalesforceRecord(objectType: SalesforceObjectType, raw: unknown, batchId?: string): NormalizedCustomer | NormalizedContract | NormalizedProduct | NormalizedPricePlan;
export declare const SALESFORCE_TO_CANONICAL_TYPE: Record<SalesforceObjectType, string>;
export {};
//# sourceMappingURL=mappers.d.ts.map