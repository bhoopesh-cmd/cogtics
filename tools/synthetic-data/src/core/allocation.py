"""
Transaction price allocation ported from packages/revrec/src/allocation.ts

Allocates transaction prices to performance obligations.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from .obligations import IdentifiedObligation


class AllocationResult:
    """Result of allocating transaction price to an obligation."""
    
    def __init__(
        self,
        obligation_index: int,
        allocation_pct,
        allocated_amount,
        allocation_basis: str,
    ):
        self.obligation_index = obligation_index
        # Ensure these are always Decimal
        self.allocation_pct = Decimal(str(allocation_pct)) if allocation_pct is not None else Decimal("0")
        self.allocated_amount = Decimal(str(allocated_amount)) if allocated_amount is not None else Decimal("0")
        self.allocation_basis = allocation_basis


def allocate_prices(
    obligations: list[IdentifiedObligation],
    total_transaction_price,
) -> list[AllocationResult]:
    """
    Allocate transaction price to obligations.
    
    Port of allocatePrices() from allocation.ts
    
    Methods:
    - SSP: Proportional allocation based on relative standalone selling price
    - Residual: Allocate known SSPs first, remainder to residual
    - Straight-line: Equal allocation when SSPs not available
    
    Args:
        obligations: List of identified obligations
        total_transaction_price: Total transaction price to allocate
        
    Returns:
        List of allocation results
    """
    if not obligations:
        return []
    
    # Ensure total_transaction_price is Decimal
    total_transaction_price = Decimal(str(total_transaction_price)) if total_transaction_price is not None else Decimal("0")
    
    # Handle single obligation case
    if len(obligations) == 1:
        return [
            AllocationResult(
                obligation_index=0,
                allocation_pct=Decimal("100"),
                allocated_amount=obligations[0].transaction_price or total_transaction_price,
                allocation_basis="single_obligation",
            )
        ]
    
    # Determine allocation method based on SSP availability
    has_all_ssp = all(o.standalone_selling_price is not None for o in obligations)
    has_some_ssp = any(o.standalone_selling_price is not None for o in obligations)
    
    if has_all_ssp:
        return _allocate_by_ssp(obligations, total_transaction_price)
    elif has_some_ssp:
        return _allocate_by_residual(obligations, total_transaction_price)
    else:
        return _allocate_by_transaction_price(obligations, total_transaction_price)


def _allocate_by_ssp(
    obligations: list[IdentifiedObligation],
    total_transaction_price: Decimal,
) -> list[AllocationResult]:
    """Allocate using Standalone Selling Price proportional method."""
    results = []
    
    # Calculate total SSP
    total_ssp = sum(
        o.standalone_selling_price or Decimal("0")
        for o in obligations
    )
    
    if total_ssp == 0:
        return _allocate_equally(obligations, total_transaction_price)
    
    # Allocate proportionally
    allocated_total = Decimal("0")
    
    for i, obligation in enumerate(obligations):
        ssp = obligation.standalone_selling_price or Decimal("0")
        allocation_pct = (ssp / total_ssp) * 100
        
        # For last obligation, allocate remainder
        is_last = i == len(obligations) - 1
        if is_last:
            allocated_amount = _round(total_transaction_price - allocated_total, 2)
        else:
            allocated_amount = _round((ssp / total_ssp) * total_transaction_price, 2)
        
        allocated_total += allocated_amount
        
        results.append(
            AllocationResult(
                obligation_index=i,
                allocation_pct=_round(allocation_pct, 4),
                allocated_amount=allocated_amount,
                allocation_basis="ssp_proportional",
            )
        )
    
    return results


def _allocate_by_residual(
    obligations: list[IdentifiedObligation],
    total_transaction_price: Decimal,
) -> list[AllocationResult]:
    """Allocate using residual method."""
    results = []
    remaining_price = total_transaction_price
    residual_indices: list[int] = []
    
    # First pass: allocate known SSPs
    for i, obligation in enumerate(obligations):
        if obligation.standalone_selling_price is not None:
            allocated_amount = min(obligation.standalone_selling_price, remaining_price)
            remaining_price -= allocated_amount
            
            results.append(
                AllocationResult(
                    obligation_index=i,
                    allocation_pct=_round(
                        (allocated_amount / total_transaction_price) * 100, 4
                    ),
                    allocated_amount=_round(allocated_amount, 2),
                    allocation_basis="ssp_known",
                )
            )
        else:
            residual_indices.append(i)
    
    # Second pass: allocate remainder to residual
    if residual_indices and remaining_price > 0:
        per_residual = remaining_price / len(residual_indices)
        
        for j, idx in enumerate(residual_indices):
            is_last = j == len(residual_indices) - 1
            if is_last:
                allocated_amount = _round(
                    remaining_price - (per_residual * j), 2
                )
            else:
                allocated_amount = _round(per_residual, 2)
            
            results.append(
                AllocationResult(
                    obligation_index=idx,
                    allocation_pct=_round(
                        (allocated_amount / total_transaction_price) * 100, 4
                    ),
                    allocated_amount=allocated_amount,
                    allocation_basis="residual",
                )
            )
    elif residual_indices:
        # No remaining price
        for idx in residual_indices:
            results.append(
                AllocationResult(
                    obligation_index=idx,
                    allocation_pct=Decimal("0"),
                    allocated_amount=Decimal("0"),
                    allocation_basis="residual_zero",
                )
            )
    
    # Sort by obligation index
    return sorted(results, key=lambda r: r.obligation_index)


def _allocate_by_transaction_price(
    obligations: list[IdentifiedObligation],
    total_transaction_price: Decimal,
) -> list[AllocationResult]:
    """Allocate based on each obligation's transaction price."""
    results = []
    
    # Calculate total from obligations
    total_from_obligations = sum(o.transaction_price for o in obligations)
    
    if total_from_obligations == 0:
        return _allocate_equally(obligations, total_transaction_price)
    
    # Use each obligation's proportion
    allocated_total = Decimal("0")
    
    for i, obligation in enumerate(obligations):
        proportion = obligation.transaction_price / total_from_obligations
        
        is_last = i == len(obligations) - 1
        if is_last:
            allocated_amount = _round(total_transaction_price - allocated_total, 2)
        else:
            allocated_amount = _round(proportion * total_transaction_price, 2)
        
        allocated_total += allocated_amount
        
        results.append(
            AllocationResult(
                obligation_index=i,
                allocation_pct=_round(proportion * 100, 4),
                allocated_amount=allocated_amount,
                allocation_basis="transaction_price_proportional",
            )
        )
    
    return results


def _allocate_equally(
    obligations: list[IdentifiedObligation],
    total_transaction_price: Decimal,
) -> list[AllocationResult]:
    """Allocate equally among all obligations."""
    results = []
    count = len(obligations)
    equal_pct = Decimal("100") / count
    per_obligation = total_transaction_price / count
    
    allocated_total = Decimal("0")
    
    for i in range(count):
        is_last = i == count - 1
        if is_last:
            allocated_amount = _round(total_transaction_price - allocated_total, 2)
        else:
            allocated_amount = _round(per_obligation, 2)
        
        allocated_total += allocated_amount
        
        results.append(
            AllocationResult(
                obligation_index=i,
                allocation_pct=_round(equal_pct, 4),
                allocated_amount=allocated_amount,
                allocation_basis="equal_allocation",
            )
        )
    
    return results


def validate_allocations(
    allocations: list[AllocationResult],
    total_transaction_price: Decimal,
    tolerance: Decimal = Decimal("0.01"),
) -> bool:
    """Validate that allocations sum to total transaction price."""
    total_allocated = sum(a.allocated_amount for a in allocations)
    return abs(total_allocated - total_transaction_price) <= tolerance


def _round(value: Decimal, decimals: int) -> Decimal:
    """Round a Decimal to specified decimal places."""
    quantize_str = "0." + "0" * decimals
    # Ensure value is a Decimal
    if not isinstance(value, Decimal):
        value = Decimal(str(value)) if value is not None else Decimal("0")
    return value.quantize(Decimal(quantize_str), rounding=ROUND_HALF_UP)
