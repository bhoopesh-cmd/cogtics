/**
 * HubSpot Schema Definitions
 */
import type { SchemaDefinition, SchemaObject } from '../types.js';

export const HUBSPOT_OBJECTS: SchemaObject[] = [
  {
    name: 'companies',
    label: 'Companies',
    supportsIncremental: true,
    incrementalField: 'hs_lastmodifieddate',
    fields: [
      { name: 'hs_object_id', type: 'string', required: true, label: 'Company ID' },
      { name: 'name', type: 'string', required: true, label: 'Company Name' },
      { name: 'domain', type: 'string', required: false, label: 'Website Domain' },
      { name: 'industry', type: 'string', required: false, label: 'Industry' },
      { name: 'phone', type: 'string', required: false, label: 'Phone Number' },
      { name: 'city', type: 'string', required: false, label: 'City' },
      { name: 'state', type: 'string', required: false, label: 'State' },
      { name: 'country', type: 'string', required: false, label: 'Country' },
      { name: 'annualrevenue', type: 'number', required: false, label: 'Annual Revenue' },
      { name: 'numberofemployees', type: 'number', required: false, label: 'Number of Employees' },
      { name: 'hs_lastmodifieddate', type: 'datetime', required: false, label: 'Last Modified Date' },
      { name: 'createdate', type: 'datetime', required: false, label: 'Create Date' },
    ],
  },
  {
    name: 'contacts',
    label: 'Contacts',
    supportsIncremental: true,
    incrementalField: 'lastmodifieddate',
    fields: [
      { name: 'hs_object_id', type: 'string', required: true, label: 'Contact ID' },
      { name: 'email', type: 'string', required: false, label: 'Email' },
      { name: 'firstname', type: 'string', required: false, label: 'First Name' },
      { name: 'lastname', type: 'string', required: false, label: 'Last Name' },
      { name: 'phone', type: 'string', required: false, label: 'Phone' },
      { name: 'company', type: 'string', required: false, label: 'Company Name' },
      { name: 'jobtitle', type: 'string', required: false, label: 'Job Title' },
      { name: 'lifecyclestage', type: 'string', required: false, label: 'Lifecycle Stage' },
      { name: 'lastmodifieddate', type: 'datetime', required: false, label: 'Last Modified Date' },
      { name: 'createdate', type: 'datetime', required: false, label: 'Create Date' },
    ],
  },
  {
    name: 'deals',
    label: 'Deals',
    supportsIncremental: true,
    incrementalField: 'hs_lastmodifieddate',
    fields: [
      { name: 'hs_object_id', type: 'string', required: true, label: 'Deal ID' },
      { name: 'dealname', type: 'string', required: true, label: 'Deal Name' },
      { name: 'amount', type: 'number', required: false, label: 'Amount' },
      { name: 'dealstage', type: 'string', required: false, label: 'Deal Stage' },
      { name: 'pipeline', type: 'string', required: false, label: 'Pipeline' },
      { name: 'closedate', type: 'datetime', required: false, label: 'Close Date' },
      { name: 'hs_lastmodifieddate', type: 'datetime', required: false, label: 'Last Modified Date' },
      { name: 'createdate', type: 'datetime', required: false, label: 'Create Date' },
    ],
  },
  {
    name: 'line_items',
    label: 'Line Items',
    supportsIncremental: true,
    incrementalField: 'hs_lastmodifieddate',
    fields: [
      { name: 'hs_object_id', type: 'string', required: true, label: 'Line Item ID' },
      { name: 'name', type: 'string', required: true, label: 'Name' },
      { name: 'quantity', type: 'number', required: false, label: 'Quantity' },
      { name: 'price', type: 'number', required: false, label: 'Price' },
      { name: 'amount', type: 'number', required: false, label: 'Amount' },
      { name: 'hs_product_id', type: 'string', required: false, label: 'Product ID' },
      { name: 'hs_lastmodifieddate', type: 'datetime', required: false, label: 'Last Modified Date' },
    ],
  },
  {
    name: 'products',
    label: 'Products',
    supportsIncremental: true,
    incrementalField: 'hs_lastmodifieddate',
    fields: [
      { name: 'hs_object_id', type: 'string', required: true, label: 'Product ID' },
      { name: 'name', type: 'string', required: true, label: 'Product Name' },
      { name: 'description', type: 'string', required: false, label: 'Description' },
      { name: 'price', type: 'number', required: false, label: 'Price' },
      { name: 'hs_sku', type: 'string', required: false, label: 'SKU' },
      { name: 'hs_lastmodifieddate', type: 'datetime', required: false, label: 'Last Modified Date' },
    ],
  },
  {
    name: 'owners',
    label: 'Owners',
    supportsIncremental: false,
    fields: [
      { name: 'id', type: 'string', required: true, label: 'Owner ID' },
      { name: 'email', type: 'string', required: true, label: 'Email' },
      { name: 'firstName', type: 'string', required: false, label: 'First Name' },
      { name: 'lastName', type: 'string', required: false, label: 'Last Name' },
    ],
  },
];

export function getHubSpotSchema(): SchemaDefinition {
  return {
    provider: 'hubspot' as any,
    objects: HUBSPOT_OBJECTS,
    discoveredAt: new Date(),
  };
}

// Properties to fetch for each object type
export const HUBSPOT_PROPERTIES: Record<string, string[]> = {
  companies: [
    'name', 'domain', 'industry', 'phone', 'city', 'state', 'country',
    'annualrevenue', 'numberofemployees', 'hs_lastmodifieddate', 'createdate',
  ],
  contacts: [
    'email', 'firstname', 'lastname', 'phone', 'company', 'jobtitle',
    'lifecyclestage', 'lastmodifieddate', 'createdate',
  ],
  deals: [
    'dealname', 'amount', 'dealstage', 'pipeline', 'closedate',
    'hs_lastmodifieddate', 'createdate',
  ],
  line_items: [
    'name', 'quantity', 'price', 'amount', 'hs_product_id', 'hs_lastmodifieddate',
  ],
  products: [
    'name', 'description', 'price', 'hs_sku', 'hs_lastmodifieddate',
  ],
};
