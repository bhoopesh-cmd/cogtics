/**
 * QuickBooks Data Mappers
 */

export interface QuickBooksCustomer {
  Id: string;
  DisplayName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  Balance?: number;
  Active?: boolean;
  MetaData?: { CreateTime: string; LastUpdatedTime: string };
}

export interface QuickBooksInvoice {
  Id: string;
  DocNumber?: string;
  CustomerRef?: { value: string; name?: string };
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance?: number;
  CurrencyRef?: { value: string };
  Line?: Array<{
    Id?: string;
    Description?: string;
    Amount?: number;
    DetailType?: string;
    SalesItemLineDetail?: {
      ItemRef?: { value: string };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  MetaData?: { CreateTime: string; LastUpdatedTime: string };
}

/**
 * Map QuickBooks customer to canonical customer
 */
export function mapQBCustomerToCustomer(customer: QuickBooksCustomer): Record<string, unknown> {
  const address = customer.BillAddr
    ? [customer.BillAddr.Line1, customer.BillAddr.City, customer.BillAddr.CountrySubDivisionCode]
        .filter(Boolean)
        .join(', ')
    : null;

  return {
    external_id: customer.Id,
    name: customer.CompanyName ?? customer.DisplayName ?? `Customer ${customer.Id}`,
    email: customer.PrimaryEmailAddr?.Address ?? null,
    phone: customer.PrimaryPhone?.FreeFormNumber ?? null,
    billing_address: address,
    status: customer.Active === false ? 'inactive' : 'active',
    metadata: {
      source: 'quickbooks',
      display_name: customer.DisplayName,
      balance: customer.Balance,
    },
  };
}

/**
 * Map QuickBooks invoice to canonical invoice
 */
export function mapQBInvoiceToInvoice(invoice: QuickBooksInvoice): Record<string, unknown> {
  return {
    external_id: invoice.Id,
    invoice_number: invoice.DocNumber ?? invoice.Id,
    customer_external_id: invoice.CustomerRef?.value,
    invoice_date: invoice.TxnDate,
    due_date: invoice.DueDate ?? null,
    total: invoice.TotalAmt,
    amount_due: invoice.Balance ?? 0,
    amount_paid: invoice.TotalAmt - (invoice.Balance ?? 0),
    currency: invoice.CurrencyRef?.value ?? 'USD',
    status: mapQBInvoiceStatus(invoice.Balance ?? 0, invoice.TotalAmt),
    metadata: {
      source: 'quickbooks',
      line_count: invoice.Line?.length ?? 0,
    },
  };
}

function mapQBInvoiceStatus(balance: number, total: number): string {
  if (balance === 0) return 'paid';
  if (balance < total) return 'partial';
  return 'open';
}
