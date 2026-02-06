/**
 * Override Validation and Application
 *
 * Pure functions for validating and applying simulation overrides.
 */
/**
 * Validate overrides against a simulation context.
 * Returns valid overrides sorted by sequence, invalid overrides with reasons, and warnings.
 */
export function validateOverrides(overrides, context) {
    const valid = [];
    const invalid = [];
    const warnings = [];
    // Sort by sequence number
    const sorted = [...overrides].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    for (const override of sorted) {
        const result = validateSingleOverride(override, context);
        if (result.isValid) {
            valid.push(override);
            if (result.warnings) {
                warnings.push(...result.warnings);
            }
        }
        else {
            invalid.push({
                overrideId: override.id,
                reason: result.reason || 'Unknown validation error',
            });
        }
    }
    return { valid, invalid, warnings };
}
function validateSingleOverride(override, context) {
    const warnings = [];
    // Check target exists
    const targetExists = checkTargetExists(override, context);
    if (!targetExists) {
        return {
            isValid: false,
            reason: `Target ${override.targetType} with ID ${override.targetId} not found in snapshot`,
        };
    }
    // Validate override type specific rules
    switch (override.overrideType) {
        case 'contract_term':
            return validateContractTermOverride(override, context);
        case 'usage_adjustment':
            return validateUsageAdjustmentOverride(override, context);
        case 'billing_adjustment':
            return validateBillingAdjustmentOverride(override, context);
        case 'timing_shift':
            return validateTimingShiftOverride(override, context);
        case 'discount_change':
            return validateDiscountChangeOverride(override, context);
        case 'price_change':
            return validatePriceChangeOverride(override, context);
        default:
            return {
                isValid: false,
                reason: `Unknown override type: ${override.overrideType}`,
            };
    }
}
function checkTargetExists(override, context) {
    switch (override.targetType) {
        case 'contract':
            return context.contracts.some(c => c.id === override.targetId);
        case 'invoice':
            return context.invoices.some(i => i.id === override.targetId);
        case 'obligation':
            return context.obligations.some(o => o.id === override.targetId);
        case 'customer':
            return context.contracts.some(c => c.customerId === override.targetId);
        case 'line_item':
            // Line items would need additional context
            return true; // Assume valid for now
        default:
            return false;
    }
}
function validateContractTermOverride(override, context) {
    if (override.targetType !== 'contract') {
        return {
            isValid: false,
            reason: 'Contract term override must target a contract',
        };
    }
    const validFields = ['arr', 'discount_rate', 'billing_frequency', 'start_date', 'end_date', 'currency', 'name'];
    if (override.fieldPath && !validFields.includes(override.fieldPath)) {
        return {
            isValid: false,
            reason: `Invalid field path for contract term: ${override.fieldPath}`,
        };
    }
    // Validate value types
    if (override.fieldPath === 'arr' || override.fieldPath === 'discount_rate') {
        if (typeof override.overrideValue !== 'number') {
            return {
                isValid: false,
                reason: `${override.fieldPath} must be a number`,
            };
        }
        if (override.fieldPath === 'arr' && override.overrideValue < 0) {
            return {
                isValid: false,
                reason: 'ARR cannot be negative',
            };
        }
    }
    return { isValid: true };
}
function validateUsageAdjustmentOverride(override, _context) {
    if (override.targetType !== 'contract') {
        return {
            isValid: false,
            reason: 'Usage adjustment override must target a contract',
        };
    }
    const value = override.overrideValue;
    if (!value.action || !['add', 'remove', 'modify'].includes(value.action)) {
        return {
            isValid: false,
            reason: 'Usage adjustment must have valid action (add, remove, modify)',
        };
    }
    return { isValid: true };
}
function validateBillingAdjustmentOverride(override, _context) {
    if (!['invoice', 'line_item'].includes(override.targetType)) {
        return {
            isValid: false,
            reason: 'Billing adjustment must target an invoice or line item',
        };
    }
    return { isValid: true };
}
function validateTimingShiftOverride(override, context) {
    if (!['contract', 'obligation'].includes(override.targetType)) {
        return {
            isValid: false,
            reason: 'Timing shift must target a contract or obligation',
        };
    }
    const value = override.overrideValue;
    const warnings = [];
    // Warn if shifting dates significantly
    if (value.shiftDays && Math.abs(value.shiftDays) > 365) {
        warnings.push({
            code: 'LARGE_DATE_SHIFT',
            message: 'Date shift of more than 1 year may have significant impact',
            targetId: override.targetId,
            overrideId: override.id,
            severity: 'warning',
        });
    }
    return { isValid: true, warnings };
}
function validateDiscountChangeOverride(override, _context) {
    if (!['contract', 'invoice', 'line_item'].includes(override.targetType)) {
        return {
            isValid: false,
            reason: 'Discount change must target a contract, invoice, or line item',
        };
    }
    const value = override.overrideValue;
    if (value.discountPct !== undefined) {
        const pct = value.discountPct;
        if (pct < 0 || pct > 100) {
            return {
                isValid: false,
                reason: 'Discount percentage must be between 0 and 100',
            };
        }
    }
    return { isValid: true };
}
function validatePriceChangeOverride(override, _context) {
    if (!['contract', 'line_item', 'obligation'].includes(override.targetType)) {
        return {
            isValid: false,
            reason: 'Price change must target a contract, line item, or obligation',
        };
    }
    return { isValid: true };
}
/**
 * Apply validated overrides to a simulation context.
 * Returns a new context with modifications applied (original is not mutated).
 */
export function applyOverrides(context, overrides) {
    // Deep clone the context to avoid mutations
    const modifiedContext = {
        snapshotId: context.snapshotId,
        tenantId: context.tenantId,
        contracts: context.contracts.map(c => ({ ...c })),
        invoices: context.invoices.map(i => ({ ...i })),
        obligations: context.obligations.map(o => ({ ...o })),
        schedules: context.schedules.map(s => ({ ...s })),
    };
    const applied = [];
    // Apply overrides in sequence
    for (const override of overrides) {
        const result = applySingleOverride(modifiedContext, override);
        if (result) {
            applied.push(result);
        }
    }
    return { context: modifiedContext, applied };
}
function applySingleOverride(context, override) {
    switch (override.overrideType) {
        case 'contract_term':
            return applyContractTermOverride(context, override);
        case 'price_change':
            return applyPriceChangeOverride(context, override);
        case 'timing_shift':
            return applyTimingShiftOverride(context, override);
        case 'discount_change':
            return applyDiscountChangeOverride(context, override);
        case 'billing_adjustment':
            return applyBillingAdjustmentOverride(context, override);
        case 'usage_adjustment':
            // Usage adjustments would require additional event handling
            return null;
        default:
            return null;
    }
}
function applyContractTermOverride(context, override) {
    const contract = context.contracts.find(c => c.id === override.targetId);
    if (!contract)
        return null;
    const fieldPath = override.fieldPath || '';
    const originalValue = getContractFieldValue(contract, fieldPath);
    // Apply the override
    setContractFieldValue(contract, fieldPath, override.overrideValue);
    return {
        overrideId: override.id,
        targetId: override.targetId,
        fieldPath,
        originalValue,
        newValue: override.overrideValue,
    };
}
function applyPriceChangeOverride(context, override) {
    const value = override.overrideValue;
    if (override.targetType === 'contract') {
        const contract = context.contracts.find(c => c.id === override.targetId);
        if (!contract)
            return null;
        const originalArr = contract.arr;
        if (value.newPrice !== undefined) {
            contract.arr = value.newPrice;
        }
        else if (value.priceDelta !== undefined) {
            contract.arr = (contract.arr || 0) + value.priceDelta;
        }
        else if (value.pricePct !== undefined) {
            contract.arr = (contract.arr || 0) * (1 + value.pricePct / 100);
        }
        return {
            overrideId: override.id,
            targetId: override.targetId,
            fieldPath: 'arr',
            originalValue: originalArr,
            newValue: contract.arr,
        };
    }
    if (override.targetType === 'obligation') {
        const obligation = context.obligations.find(o => o.id === override.targetId);
        if (!obligation)
            return null;
        const originalPrice = obligation.transactionPrice;
        if (value.newPrice !== undefined) {
            obligation.transactionPrice = value.newPrice;
        }
        else if (value.priceDelta !== undefined) {
            obligation.transactionPrice = obligation.transactionPrice + value.priceDelta;
        }
        else if (value.pricePct !== undefined) {
            obligation.transactionPrice = obligation.transactionPrice * (1 + value.pricePct / 100);
        }
        return {
            overrideId: override.id,
            targetId: override.targetId,
            fieldPath: 'transactionPrice',
            originalValue: originalPrice,
            newValue: obligation.transactionPrice,
        };
    }
    return null;
}
function applyTimingShiftOverride(context, override) {
    const value = override.overrideValue;
    const shiftDays = value.shiftDays || 0;
    const newDate = value.newDate ? new Date(value.newDate) : null;
    const shiftType = value.shiftType;
    if (override.targetType === 'contract') {
        const contract = context.contracts.find(c => c.id === override.targetId);
        if (!contract)
            return null;
        let originalValue = null;
        let fieldPath = '';
        if (shiftType === 'start_date' || shiftType === 'recognition_start') {
            fieldPath = 'startDate';
            originalValue = contract.startDate;
            if (newDate) {
                contract.startDate = newDate;
            }
            else if (contract.startDate) {
                contract.startDate = addDays(contract.startDate, shiftDays);
            }
        }
        else if (shiftType === 'end_date' || shiftType === 'recognition_end') {
            fieldPath = 'endDate';
            originalValue = contract.endDate;
            if (newDate) {
                contract.endDate = newDate;
            }
            else if (contract.endDate) {
                contract.endDate = addDays(contract.endDate, shiftDays);
            }
        }
        return {
            overrideId: override.id,
            targetId: override.targetId,
            fieldPath,
            originalValue,
            newValue: fieldPath === 'startDate' ? contract.startDate : contract.endDate,
        };
    }
    if (override.targetType === 'obligation') {
        const obligation = context.obligations.find(o => o.id === override.targetId);
        if (!obligation)
            return null;
        let originalValue = null;
        let fieldPath = '';
        if (shiftType === 'start_date' || shiftType === 'recognition_start') {
            fieldPath = 'serviceStartDate';
            originalValue = obligation.serviceStartDate;
            if (newDate) {
                obligation.serviceStartDate = newDate;
            }
            else if (obligation.serviceStartDate) {
                obligation.serviceStartDate = addDays(obligation.serviceStartDate, shiftDays);
            }
        }
        else if (shiftType === 'end_date' || shiftType === 'recognition_end') {
            fieldPath = 'serviceEndDate';
            originalValue = obligation.serviceEndDate;
            if (newDate) {
                obligation.serviceEndDate = newDate;
            }
            else if (obligation.serviceEndDate) {
                obligation.serviceEndDate = addDays(obligation.serviceEndDate, shiftDays);
            }
        }
        return {
            overrideId: override.id,
            targetId: override.targetId,
            fieldPath,
            originalValue,
            newValue: fieldPath === 'serviceStartDate' ? obligation.serviceStartDate : obligation.serviceEndDate,
        };
    }
    return null;
}
function applyDiscountChangeOverride(context, override) {
    const value = override.overrideValue;
    const discountPct = value.discountPct;
    const discountAmount = value.discountAmount;
    if (override.targetType === 'contract') {
        const contract = context.contracts.find(c => c.id === override.targetId);
        if (!contract || !contract.arr)
            return null;
        const originalArr = contract.arr;
        if (discountPct !== undefined) {
            contract.arr = contract.arr * (1 - discountPct / 100);
        }
        else if (discountAmount !== undefined) {
            contract.arr = contract.arr - discountAmount;
        }
        return {
            overrideId: override.id,
            targetId: override.targetId,
            fieldPath: 'arr',
            originalValue: originalArr,
            newValue: contract.arr,
        };
    }
    if (override.targetType === 'invoice') {
        const invoice = context.invoices.find(i => i.id === override.targetId);
        if (!invoice)
            return null;
        const originalTotal = invoice.total;
        if (discountPct !== undefined) {
            invoice.total = invoice.total * (1 - discountPct / 100);
        }
        else if (discountAmount !== undefined) {
            invoice.total = invoice.total - discountAmount;
        }
        return {
            overrideId: override.id,
            targetId: override.targetId,
            fieldPath: 'total',
            originalValue: originalTotal,
            newValue: invoice.total,
        };
    }
    return null;
}
function applyBillingAdjustmentOverride(context, override) {
    const value = override.overrideValue;
    const adjustmentAmount = value.adjustmentAmount;
    const adjustmentPct = value.adjustmentPct;
    if (override.targetType === 'invoice') {
        const invoice = context.invoices.find(i => i.id === override.targetId);
        if (!invoice)
            return null;
        const originalTotal = invoice.total;
        if (adjustmentAmount !== undefined) {
            invoice.total = invoice.total + adjustmentAmount;
        }
        else if (adjustmentPct !== undefined) {
            invoice.total = invoice.total * (1 + adjustmentPct / 100);
        }
        return {
            overrideId: override.id,
            targetId: override.targetId,
            fieldPath: 'total',
            originalValue: originalTotal,
            newValue: invoice.total,
        };
    }
    return null;
}
// Helper functions
function getContractFieldValue(contract, fieldPath) {
    switch (fieldPath) {
        case 'arr': return contract.arr;
        case 'name': return contract.name;
        case 'start_date': return contract.startDate;
        case 'end_date': return contract.endDate;
        case 'billing_frequency': return contract.billingFrequency;
        case 'currency': return contract.currency;
        default: return undefined;
    }
}
function setContractFieldValue(contract, fieldPath, value) {
    switch (fieldPath) {
        case 'arr':
            contract.arr = value;
            break;
        case 'name':
            contract.name = value;
            break;
        case 'start_date':
            contract.startDate = value instanceof Date ? value : new Date(value);
            break;
        case 'end_date':
            contract.endDate = value instanceof Date ? value : new Date(value);
            break;
        case 'billing_frequency':
            contract.billingFrequency = value;
            break;
        case 'currency':
            contract.currency = value;
            break;
    }
}
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
//# sourceMappingURL=overrides.js.map