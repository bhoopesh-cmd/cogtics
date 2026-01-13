import type { SchemaDefinition, SchemaObject, SchemaField } from '../types.js';
import type { RateLimitedHttpClient } from '../base/http.js';

// Default Salesforce objects to sync
const SALESFORCE_DEFAULT_OBJECTS: SchemaObject[] = [
  {
    name: 'Account',
    label: 'Accounts',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'Contact',
    label: 'Contacts',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'Opportunity',
    label: 'Opportunities',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'OpportunityLineItem',
    label: 'Opportunity Line Items',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'Lead',
    label: 'Leads',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'Contract',
    label: 'Contracts',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'User',
    label: 'Users',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'Product2',
    label: 'Products',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
  {
    name: 'PricebookEntry',
    label: 'Price Book Entries',
    fields: [],
    supportsIncremental: true,
    incrementalField: 'LastModifiedDate',
  },
];

/**
 * Map Salesforce field types to normalized types
 */
function mapSalesforceType(sfType: string): string {
  const typeMap: Record<string, string> = {
    id: 'string',
    string: 'string',
    textarea: 'string',
    email: 'string',
    url: 'string',
    phone: 'string',
    picklist: 'string',
    multipicklist: 'array',
    combobox: 'string',
    reference: 'string',
    boolean: 'boolean',
    int: 'integer',
    double: 'number',
    currency: 'number',
    percent: 'number',
    date: 'date',
    datetime: 'datetime',
    time: 'time',
    base64: 'string',
    address: 'object',
    location: 'object',
    encryptedstring: 'string',
  };

  return typeMap[sfType.toLowerCase()] ?? 'string';
}

/**
 * Discover schema from Salesforce by calling the describe API
 */
export async function discoverSalesforceSchema(
  instanceUrl: string,
  accessToken: string,
  apiVersion: string,
  httpClient: RateLimitedHttpClient
): Promise<SchemaDefinition> {
  const objects: SchemaObject[] = [];
  const baseUrl = `${instanceUrl}/services/data/${apiVersion}`;

  for (const defaultObj of SALESFORCE_DEFAULT_OBJECTS) {
    try {
      const describeUrl = `${baseUrl}/sobjects/${defaultObj.name}/describe`;

      const response = await httpClient.request<{
        name: string;
        label: string;
        fields: Array<{
          name: string;
          label: string;
          type: string;
          nillable: boolean;
          updateable: boolean;
          createable: boolean;
          custom: boolean;
          inlineHelpText?: string;
        }>;
      }>({
        method: 'GET',
        url: describeUrl,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status !== 200) {
        // Skip objects that can't be described (permissions, etc.)
        continue;
      }

      const fields: SchemaField[] = response.data.fields.map((field) => ({
        name: field.name,
        type: mapSalesforceType(field.type),
        label: field.label,
        required: !field.nillable,
        description: field.inlineHelpText,
      }));

      objects.push({
        name: response.data.name,
        label: response.data.label,
        fields,
        supportsIncremental: true,
        incrementalField: 'LastModifiedDate',
      });
    } catch (error) {
      // Skip objects that fail to describe
      console.warn(`Failed to describe ${defaultObj.name}:`, error);
    }
  }

  return {
    provider: 'salesforce',
    objects,
    discoveredAt: new Date(),
  };
}

/**
 * Get list of default Salesforce objects
 */
export function getSalesforceDefaultObjects(): SchemaObject[] {
  return [...SALESFORCE_DEFAULT_OBJECTS];
}

/**
 * Get object schema by name
 */
export function getSalesforceObjectSchema(objectType: string): SchemaObject | undefined {
  return SALESFORCE_DEFAULT_OBJECTS.find((obj) => obj.name === objectType);
}

