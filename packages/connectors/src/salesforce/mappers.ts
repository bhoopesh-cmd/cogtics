/**
 * Salesforce Mappers
 * 
 * Pure functions that transform raw Salesforce API data into normalized shapes.
 * All mappers validate output with Zod and return validated results.
 */
import {
  NormalizedCustomerSchema,
  NormalizedContractSchema,
  NormalizedProductSchema,
  NormalizedPricePlanSchema,
  type NormalizedCustomer,
  type NormalizedContract,
  type NormalizedProduct,
  type NormalizedPricePlan,
  type SourceInfo,
} from '@cogtics/schemas';

// ============================================
// Raw Salesforce Types
// ============================================

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
  // Custom fields are common
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
  ContractTerm?: number | null; // Months
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
  // Custom fields for contract value
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

// ============================================
// Helper Functions
// ============================================

function createSourceInfo(batchId?: string, recordId?: string): SourceInfo {
  return {
    system: 'salesforce',
    batchId,
    recordId,
  };
}

function mapOpportunityStage(stageName: string, isClosed: boolean, isWon: boolean): 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed' {
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

function mapContractStatus(status: string): 'draft' | 'active' | 'expired' | 'cancelled' | 'renewed' {
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

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================
// Mapper Functions
// ============================================

export function mapSalesforceAccount(
  raw: SalesforceAccount,
  batchId?: string,
): NormalizedCustomer {
  const normalized = {
    externalId: raw.Id,
    externalIds: { salesforce: raw.Id },
    name: raw.Name,
    email: null, // Accounts don't have email, contacts do
    status: raw.IsDeleted ? 'inactive' : 'active' as const,
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

export function mapSalesforceContact(
  raw: SalesforceContact,
  batchId?: string,
): NormalizedCustomer {
  const name = [raw.FirstName, raw.LastName].filter(Boolean).join(' ') || raw.Id;
  
  const normalized = {
    externalId: raw.Id,
    externalIds: { salesforce: raw.Id, salesforceAccountId: raw.AccountId || undefined },
    name,
    email: raw.Email || null,
    status: raw.IsDeleted ? 'inactive' : 'active' as const,
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

export function mapSalesforceOpportunity(
  raw: SalesforceOpportunity,
  batchId?: string,
): NormalizedContract {
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
    billingFrequency: 'annually' as const, // Default assumption for opportunities
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

export function mapSalesforceContract(
  raw: SalesforceContract,
  batchId?: string,
): NormalizedContract {
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
    billingFrequency: 'monthly' as const, // Default
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

export function mapSalesforceProduct(
  raw: SalesforceProduct,
  batchId?: string,
): NormalizedProduct {
  const normalized = {
    externalId: raw.Id,
    externalIds: { salesforce: raw.Id },
    sku: raw.ProductCode || null,
    name: raw.Name,
    description: raw.Description || null,
    category: raw.Family || null,
    status: raw.IsActive && !raw.IsDeleted ? 'active' : 'inactive' as const,
    metadata: {},
    source: createSourceInfo(batchId, raw.Id),
  };

  return NormalizedProductSchema.parse(normalized);
}

export function mapSalesforcePricebookEntry(
  raw: SalesforcePricebookEntry,
  batchId?: string,
): NormalizedPricePlan {
  const normalized = {
    externalId: raw.Id,
    externalIds: { salesforce: raw.Id, pricebookId: raw.Pricebook2Id },
    productExternalId: raw.Product2Id,
    name: null,
    billingCadence: null,
    currency: raw.CurrencyIsoCode || 'USD',
    price: {
      type: 'flat' as const,
      amount: raw.UnitPrice,
    },
    status: raw.IsActive && !raw.IsDeleted ? 'active' : 'inactive' as const,
    metadata: {
      useStandardPrice: raw.UseStandardPrice,
    },
    source: createSourceInfo(batchId, raw.Id),
  };

  return NormalizedPricePlanSchema.parse(normalized);
}

// ============================================
// Mapper Registry
// ============================================

export type SalesforceObjectType = 'Account' | 'Contact' | 'Opportunity' | 'Contract' | 'Product2' | 'PricebookEntry';

export function mapSalesforceRecord(
  objectType: SalesforceObjectType,
  raw: unknown,
  batchId?: string,
): NormalizedCustomer | NormalizedContract | NormalizedProduct | NormalizedPricePlan {
  switch (objectType) {
    case 'Account':
      return mapSalesforceAccount(raw as SalesforceAccount, batchId);
    case 'Contact':
      return mapSalesforceContact(raw as SalesforceContact, batchId);
    case 'Opportunity':
      return mapSalesforceOpportunity(raw as SalesforceOpportunity, batchId);
    case 'Contract':
      return mapSalesforceContract(raw as SalesforceContract, batchId);
    case 'Product2':
      return mapSalesforceProduct(raw as SalesforceProduct, batchId);
    case 'PricebookEntry':
      return mapSalesforcePricebookEntry(raw as SalesforcePricebookEntry, batchId);
    default:
      throw new Error(`Unknown Salesforce object type: ${objectType}`);
  }
}

// Map Salesforce object types to canonical types
export const SALESFORCE_TO_CANONICAL_TYPE: Record<SalesforceObjectType, string> = {
  Account: 'customer',
  Contact: 'customer',
  Opportunity: 'contract',
  Contract: 'contract',
  Product2: 'product',
  PricebookEntry: 'pricePlan',
};

