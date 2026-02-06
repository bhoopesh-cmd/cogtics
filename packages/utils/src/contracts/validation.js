/**
 * Contract Term Validation
 *
 * Validates extracted contract terms for logical consistency,
 * business rules, and data quality.
 */
// ============================================
// Valid Values
// ============================================
const VALID_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'HKD',
    'SGD', 'INR', 'NZD', 'MXN', 'BRL', 'KRW', 'SEK', 'NOK', 'DKK',
];
const VALID_CADENCES = [
    'monthly', 'quarterly', 'annually', 'semi-annually',
    'one_time', 'one-time', 'weekly', 'bi-weekly', 'usage_based'
];
const VALID_PRICING_MODELS = [
    'per_user', 'per_seat', 'flat_fee', 'usage_based', 'tiered',
    'hybrid', 'freemium', 'per_transaction', 'custom'
];
// ============================================
// Validation Rules
// ============================================
const VALIDATION_RULES = [
    // Date consistency rules
    {
        name: 'end_after_start',
        description: 'End date must be after start date',
        termTypes: ['end_date'],
        severity: 'error',
        validate: (term, allTerms, termIndex) => {
            const startTerm = allTerms.find(t => t.termType === 'start_date');
            if (!startTerm)
                return null;
            const startDate = parseDate(startTerm.value);
            const endDate = parseDate(term.value);
            if (startDate && endDate && endDate < startDate) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'end_after_start',
                    severity: 'error',
                    message: `End date (${formatDate(endDate)}) is before start date (${formatDate(startDate)})`,
                    suggestion: 'Verify the dates are correct or swap start and end dates',
                    fieldPath: 'value.date',
                };
            }
            return null;
        },
    },
    {
        name: 'term_length_consistency',
        description: 'Term length should match date range',
        termTypes: ['term_length'],
        severity: 'warning',
        validate: (term, allTerms, termIndex) => {
            const startTerm = allTerms.find(t => t.termType === 'start_date');
            const endTerm = allTerms.find(t => t.termType === 'end_date');
            if (!startTerm || !endTerm)
                return null;
            const startDate = parseDate(startTerm.value);
            const endDate = parseDate(endTerm.value);
            const termLengthMonths = parseTermLength(term.value);
            if (startDate && endDate && termLengthMonths !== null) {
                const actualMonths = monthsDiff(startDate, endDate);
                const tolerance = 1; // Allow 1 month tolerance
                if (Math.abs(actualMonths - termLengthMonths) > tolerance) {
                    return {
                        termIndex,
                        termType: term.termType,
                        ruleName: 'term_length_consistency',
                        severity: 'warning',
                        message: `Term length (${termLengthMonths} months) doesn't match date range (${actualMonths} months)`,
                        suggestion: 'Verify term length matches the contract period',
                    };
                }
            }
            return null;
        },
    },
    {
        name: 'future_start_date',
        description: 'Flag start dates far in the future',
        termTypes: ['start_date'],
        severity: 'warning',
        validate: (term, _, termIndex) => {
            const startDate = parseDate(term.value);
            if (!startDate)
                return null;
            const twoYearsFromNow = new Date();
            twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
            if (startDate > twoYearsFromNow) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'future_start_date',
                    severity: 'warning',
                    message: `Start date (${formatDate(startDate)}) is more than 2 years in the future`,
                    suggestion: 'Verify this is intentional or if the date was extracted incorrectly',
                };
            }
            return null;
        },
    },
    // Financial validation rules
    {
        name: 'discount_max_100',
        description: 'Discount percentage cannot exceed 100%',
        termTypes: ['discount'],
        severity: 'error',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const percentage = value?.percentage;
            if (percentage !== undefined && percentage > 100) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'discount_max_100',
                    severity: 'error',
                    message: `Discount percentage (${percentage}%) exceeds 100%`,
                    suggestion: 'Verify the discount value is correct',
                    fieldPath: 'value.percentage',
                };
            }
            return null;
        },
    },
    {
        name: 'discount_positive',
        description: 'Discount must be positive',
        termTypes: ['discount'],
        severity: 'error',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const percentage = value?.percentage;
            const amount = value?.amount;
            if ((percentage !== undefined && percentage < 0) ||
                (amount !== undefined && amount < 0)) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'discount_positive',
                    severity: 'error',
                    message: 'Discount value is negative',
                    suggestion: 'A negative discount should be an uplift/price increase',
                };
            }
            return null;
        },
    },
    {
        name: 'valid_currency',
        description: 'Currency code must be valid ISO 4217',
        termTypes: ['currency', 'contract_value', 'unit_price', 'min_commit', 'credits', 'implementation_fee'],
        severity: 'error',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const currency = value?.currency?.toUpperCase();
            if (currency && !VALID_CURRENCIES.includes(currency)) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'valid_currency',
                    severity: 'error',
                    message: `Unknown currency code: ${currency}`,
                    suggestion: `Valid currencies include: ${VALID_CURRENCIES.slice(0, 5).join(', ')}...`,
                    fieldPath: 'value.currency',
                };
            }
            return null;
        },
    },
    {
        name: 'positive_contract_value',
        description: 'Contract value must be positive',
        termTypes: ['contract_value', 'unit_price', 'min_commit'],
        severity: 'error',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const amount = value?.amount;
            if (amount !== undefined && amount <= 0) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'positive_contract_value',
                    severity: 'error',
                    message: `${term.termType} amount must be positive (got ${amount})`,
                    suggestion: 'Verify the amount was extracted correctly',
                    fieldPath: 'value.amount',
                };
            }
            return null;
        },
    },
    {
        name: 'reasonable_contract_value',
        description: 'Flag unusually large contract values',
        termTypes: ['contract_value'],
        severity: 'warning',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const amount = value?.amount;
            // Flag contracts over $100M as unusual
            if (amount !== undefined && amount > 100_000_000) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'reasonable_contract_value',
                    severity: 'warning',
                    message: `Contract value (${formatCurrency(amount)}) is unusually large`,
                    suggestion: 'Verify this amount is correct and not a parsing error',
                };
            }
            return null;
        },
    },
    // Cadence and timing validation
    {
        name: 'valid_billing_cadence',
        description: 'Billing cadence must be a valid option',
        termTypes: ['billing_cadence'],
        severity: 'warning',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const cadence = value?.cadence?.toLowerCase();
            if (cadence && !VALID_CADENCES.includes(cadence)) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'valid_billing_cadence',
                    severity: 'warning',
                    message: `Unusual billing cadence: ${cadence}`,
                    suggestion: `Common cadences: ${VALID_CADENCES.slice(0, 4).join(', ')}`,
                    fieldPath: 'value.cadence',
                };
            }
            return null;
        },
    },
    {
        name: 'valid_pricing_model',
        description: 'Pricing model must be a recognized type',
        termTypes: ['pricing_model'],
        severity: 'info',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const model = value?.model?.toLowerCase();
            if (model && !VALID_PRICING_MODELS.includes(model)) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'valid_pricing_model',
                    severity: 'info',
                    message: `Non-standard pricing model: ${model}`,
                    suggestion: `Consider mapping to: ${VALID_PRICING_MODELS.slice(0, 4).join(', ')}`,
                    fieldPath: 'value.model',
                };
            }
            return null;
        },
    },
    // Notice period validation
    {
        name: 'reasonable_notice_period',
        description: 'Notice period should be reasonable',
        termTypes: ['notice_period', 'termination_notice_period'],
        severity: 'warning',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const days = value?.days;
            if (days !== undefined) {
                if (days > 365) {
                    return {
                        termIndex,
                        termType: term.termType,
                        ruleName: 'reasonable_notice_period',
                        severity: 'warning',
                        message: `Notice period (${days} days) is unusually long`,
                        suggestion: 'Verify this is correct or if the unit should be different',
                    };
                }
                if (days < 0) {
                    return {
                        termIndex,
                        termType: term.termType,
                        ruleName: 'reasonable_notice_period',
                        severity: 'error',
                        message: 'Notice period cannot be negative',
                        suggestion: 'Check the extracted value',
                    };
                }
            }
            return null;
        },
    },
    // Payment terms validation
    {
        name: 'reasonable_payment_terms',
        description: 'Payment terms (net days) should be reasonable',
        termTypes: ['payment_terms'],
        severity: 'warning',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const netDays = value?.netDays;
            if (netDays !== undefined && netDays > 180) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'reasonable_payment_terms',
                    severity: 'warning',
                    message: `Payment terms (Net ${netDays}) is unusually long`,
                    suggestion: 'Most payment terms are Net 30, 45, or 60',
                };
            }
            return null;
        },
    },
    // Quantity validation
    {
        name: 'positive_quantity',
        description: 'Quantity must be positive',
        termTypes: ['quantity', 'usage_caps', 'min_commit'],
        severity: 'error',
        validate: (term, _, termIndex) => {
            const value = term.value;
            const quantity = (value?.quantity ?? value?.amount);
            if (quantity !== undefined && quantity <= 0) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'positive_quantity',
                    severity: 'error',
                    message: 'Quantity must be positive',
                    suggestion: 'Check the extracted value',
                };
            }
            return null;
        },
    },
    // Low confidence warning
    {
        name: 'low_confidence',
        description: 'Flag terms with low extraction confidence',
        termTypes: 'all',
        severity: 'info',
        validate: (term, _, termIndex) => {
            if (term.confidence < 0.5) {
                return {
                    termIndex,
                    termType: term.termType,
                    ruleName: 'low_confidence',
                    severity: 'info',
                    message: `Low extraction confidence (${(term.confidence * 100).toFixed(0)}%)`,
                    suggestion: 'Consider manual review of this term',
                };
            }
            return null;
        },
    },
];
// ============================================
// Main Functions
// ============================================
/**
 * Validate all extracted terms
 */
export function validateTerms(terms) {
    const issues = [];
    const termResults = new Map();
    // Initialize term results
    terms.forEach((term, index) => {
        termResults.set(index, {
            termIndex: index,
            termType: term.termType,
            isValid: true,
            issues: [],
        });
    });
    // Apply each rule
    for (const rule of VALIDATION_RULES) {
        for (let i = 0; i < terms.length; i++) {
            const term = terms[i];
            // Check if rule applies to this term type
            if (rule.termTypes !== 'all' && !rule.termTypes.includes(term.termType)) {
                continue;
            }
            const issue = rule.validate(term, terms, i);
            if (issue) {
                issues.push(issue);
                const termResult = termResults.get(i);
                termResult.issues.push(issue);
                if (issue.severity === 'error') {
                    termResult.isValid = false;
                }
            }
        }
    }
    // Determine overall validity
    const hasErrors = issues.some(i => i.severity === 'error');
    return {
        isValid: !hasErrors,
        issues,
        termResults,
    };
}
/**
 * Validate a single term
 */
export function validateTerm(term, allTerms = []) {
    const issues = [];
    const termIndex = allTerms.indexOf(term);
    const index = termIndex >= 0 ? termIndex : 0;
    for (const rule of VALIDATION_RULES) {
        if (rule.termTypes !== 'all' && !rule.termTypes.includes(term.termType)) {
            continue;
        }
        const issue = rule.validate(term, allTerms.length > 0 ? allTerms : [term], index);
        if (issue) {
            issues.push(issue);
        }
    }
    return issues;
}
/**
 * Get all validation rules (for documentation/transparency)
 */
export function getValidationRules() {
    return VALIDATION_RULES.map(r => ({
        name: r.name,
        description: r.description,
        termTypes: r.termTypes,
        severity: r.severity,
    }));
}
// ============================================
// Helper Functions
// ============================================
function parseDate(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value;
    const obj = value;
    const dateStr = obj?.date;
    if (!dateStr)
        return null;
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date;
    }
    // Try MM/DD/YYYY format
    const mdyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (mdyMatch) {
        const [, month, day, year] = mdyMatch;
        const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
        return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }
    return null;
}
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
function parseTermLength(value) {
    if (!value)
        return null;
    const obj = value;
    if (obj.months !== undefined) {
        return obj.months;
    }
    if (obj.years !== undefined) {
        return obj.years * 12;
    }
    return null;
}
function monthsDiff(start, end) {
    return (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth());
}
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(amount);
}
//# sourceMappingURL=validation.js.map