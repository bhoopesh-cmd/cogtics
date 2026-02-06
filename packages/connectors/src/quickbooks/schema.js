export const QUICKBOOKS_OBJECTS = [
    {
        name: 'Customer',
        label: 'Customers',
        supportsIncremental: true,
        incrementalField: 'MetaData.LastUpdatedTime',
        fields: [
            { name: 'Id', type: 'string', required: true, label: 'Customer ID' },
            { name: 'DisplayName', type: 'string', required: true, label: 'Display Name' },
            { name: 'CompanyName', type: 'string', required: false, label: 'Company Name' },
            { name: 'PrimaryEmailAddr.Address', type: 'string', required: false, label: 'Email' },
            { name: 'PrimaryPhone.FreeFormNumber', type: 'string', required: false, label: 'Phone' },
            { name: 'Balance', type: 'number', required: false, label: 'Balance' },
            { name: 'Active', type: 'boolean', required: false, label: 'Active' },
            { name: 'MetaData.CreateTime', type: 'datetime', required: false, label: 'Created' },
            { name: 'MetaData.LastUpdatedTime', type: 'datetime', required: false, label: 'Last Updated' },
        ],
    },
    {
        name: 'Invoice',
        label: 'Invoices',
        supportsIncremental: true,
        incrementalField: 'MetaData.LastUpdatedTime',
        fields: [
            { name: 'Id', type: 'string', required: true, label: 'Invoice ID' },
            { name: 'DocNumber', type: 'string', required: false, label: 'Invoice Number' },
            { name: 'CustomerRef.value', type: 'string', required: true, label: 'Customer ID' },
            { name: 'TxnDate', type: 'date', required: true, label: 'Transaction Date' },
            { name: 'DueDate', type: 'date', required: false, label: 'Due Date' },
            { name: 'TotalAmt', type: 'number', required: true, label: 'Total Amount' },
            { name: 'Balance', type: 'number', required: false, label: 'Balance Due' },
            { name: 'CurrencyRef.value', type: 'string', required: false, label: 'Currency' },
            { name: 'MetaData.LastUpdatedTime', type: 'datetime', required: false, label: 'Last Updated' },
        ],
    },
    {
        name: 'Payment',
        label: 'Payments',
        supportsIncremental: true,
        incrementalField: 'MetaData.LastUpdatedTime',
        fields: [
            { name: 'Id', type: 'string', required: true, label: 'Payment ID' },
            { name: 'CustomerRef.value', type: 'string', required: true, label: 'Customer ID' },
            { name: 'TxnDate', type: 'date', required: true, label: 'Transaction Date' },
            { name: 'TotalAmt', type: 'number', required: true, label: 'Total Amount' },
            { name: 'CurrencyRef.value', type: 'string', required: false, label: 'Currency' },
            { name: 'PaymentMethodRef.value', type: 'string', required: false, label: 'Payment Method' },
            { name: 'MetaData.LastUpdatedTime', type: 'datetime', required: false, label: 'Last Updated' },
        ],
    },
    {
        name: 'Item',
        label: 'Products/Services',
        supportsIncremental: true,
        incrementalField: 'MetaData.LastUpdatedTime',
        fields: [
            { name: 'Id', type: 'string', required: true, label: 'Item ID' },
            { name: 'Name', type: 'string', required: true, label: 'Name' },
            { name: 'Description', type: 'string', required: false, label: 'Description' },
            { name: 'Type', type: 'string', required: true, label: 'Type' },
            { name: 'UnitPrice', type: 'number', required: false, label: 'Unit Price' },
            { name: 'Active', type: 'boolean', required: false, label: 'Active' },
            { name: 'MetaData.LastUpdatedTime', type: 'datetime', required: false, label: 'Last Updated' },
        ],
    },
    {
        name: 'Account',
        label: 'Chart of Accounts',
        supportsIncremental: true,
        incrementalField: 'MetaData.LastUpdatedTime',
        fields: [
            { name: 'Id', type: 'string', required: true, label: 'Account ID' },
            { name: 'Name', type: 'string', required: true, label: 'Account Name' },
            { name: 'AccountType', type: 'string', required: true, label: 'Account Type' },
            { name: 'AccountSubType', type: 'string', required: false, label: 'Account Sub-Type' },
            { name: 'CurrentBalance', type: 'number', required: false, label: 'Current Balance' },
            { name: 'Active', type: 'boolean', required: false, label: 'Active' },
        ],
    },
    {
        name: 'Term',
        label: 'Payment Terms',
        supportsIncremental: false,
        fields: [
            { name: 'Id', type: 'string', required: true, label: 'Term ID' },
            { name: 'Name', type: 'string', required: true, label: 'Term Name' },
            { name: 'DueDays', type: 'number', required: false, label: 'Due Days' },
            { name: 'Active', type: 'boolean', required: false, label: 'Active' },
        ],
    },
];
export function getQuickBooksSchema() {
    return {
        provider: 'quickbooks',
        objects: QUICKBOOKS_OBJECTS,
        discoveredAt: new Date(),
    };
}
//# sourceMappingURL=schema.js.map