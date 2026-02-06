/**
 * QuickBooks Data Mappers
 */
export interface QuickBooksCustomer {
    Id: string;
    DisplayName?: string;
    CompanyName?: string;
    PrimaryEmailAddr?: {
        Address: string;
    };
    PrimaryPhone?: {
        FreeFormNumber: string;
    };
    BillAddr?: {
        Line1?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
    };
    Balance?: number;
    Active?: boolean;
    MetaData?: {
        CreateTime: string;
        LastUpdatedTime: string;
    };
}
export interface QuickBooksInvoice {
    Id: string;
    DocNumber?: string;
    CustomerRef?: {
        value: string;
        name?: string;
    };
    TxnDate: string;
    DueDate?: string;
    TotalAmt: number;
    Balance?: number;
    CurrencyRef?: {
        value: string;
    };
    Line?: Array<{
        Id?: string;
        Description?: string;
        Amount?: number;
        DetailType?: string;
        SalesItemLineDetail?: {
            ItemRef?: {
                value: string;
            };
            Qty?: number;
            UnitPrice?: number;
        };
    }>;
    MetaData?: {
        CreateTime: string;
        LastUpdatedTime: string;
    };
}
/**
 * Map QuickBooks customer to canonical customer
 */
export declare function mapQBCustomerToCustomer(customer: QuickBooksCustomer): Record<string, unknown>;
/**
 * Map QuickBooks invoice to canonical invoice
 */
export declare function mapQBInvoiceToInvoice(invoice: QuickBooksInvoice): Record<string, unknown>;
//# sourceMappingURL=mappers.d.ts.map