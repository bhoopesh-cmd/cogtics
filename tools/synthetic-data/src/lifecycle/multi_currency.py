"""
Multi-currency and FX rate support.
"""

import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional


class Currency(str, Enum):
    """Supported currencies."""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    CAD = "CAD"
    AUD = "AUD"
    JPY = "JPY"
    CHF = "CHF"
    INR = "INR"
    BRL = "BRL"
    MXN = "MXN"


# Base exchange rates (vs USD)
BASE_FX_RATES = {
    Currency.USD: Decimal("1.0"),
    Currency.EUR: Decimal("0.92"),
    Currency.GBP: Decimal("0.79"),
    Currency.CAD: Decimal("1.36"),
    Currency.AUD: Decimal("1.53"),
    Currency.JPY: Decimal("149.50"),
    Currency.CHF: Decimal("0.88"),
    Currency.INR: Decimal("83.12"),
    Currency.BRL: Decimal("4.97"),
    Currency.MXN: Decimal("17.15"),
}


@dataclass
class FXRate:
    """Foreign exchange rate."""
    from_currency: Currency
    to_currency: Currency
    rate: Decimal
    rate_date: date
    source: str = "synthetic"
    
    def convert(self, amount: Decimal) -> Decimal:
        """Convert an amount using this rate."""
        return (amount * self.rate).quantize(Decimal("0.01"))


class FXRateProvider:
    """
    Provides FX rates with optional historical variation.
    """
    
    def __init__(
        self,
        base_rates: Optional[dict[Currency, Decimal]] = None,
        volatility: float = 0.05,  # 5% max daily change
    ):
        """Initialize the FX provider."""
        self.base_rates = base_rates or BASE_FX_RATES.copy()
        self.volatility = volatility
        self._rate_cache: dict[tuple[Currency, Currency, date], FXRate] = {}
    
    def get_rate(
        self,
        from_currency: Currency,
        to_currency: Currency,
        rate_date: Optional[date] = None,
    ) -> FXRate:
        """
        Get exchange rate between two currencies.
        
        Args:
            from_currency: Source currency
            to_currency: Target currency
            rate_date: Date for historical rate
            
        Returns:
            FXRate object
        """
        rate_date = rate_date or date.today()
        
        # Check cache
        cache_key = (from_currency, to_currency, rate_date)
        if cache_key in self._rate_cache:
            return self._rate_cache[cache_key]
        
        # Calculate rate
        from_usd = self.base_rates.get(from_currency, Decimal("1"))
        to_usd = self.base_rates.get(to_currency, Decimal("1"))
        
        # Base cross rate
        if from_currency == Currency.USD:
            rate = to_usd
        elif to_currency == Currency.USD:
            rate = Decimal("1") / from_usd
        else:
            rate = to_usd / from_usd
        
        # Add historical variation
        if rate_date != date.today():
            days_ago = (date.today() - rate_date).days
            variation = self._calculate_variation(days_ago)
            rate = rate * (1 + variation)
        
        fx_rate = FXRate(
            from_currency=from_currency,
            to_currency=to_currency,
            rate=rate.quantize(Decimal("0.000001")),
            rate_date=rate_date,
        )
        
        self._rate_cache[cache_key] = fx_rate
        return fx_rate
    
    def _calculate_variation(self, days_ago: int) -> Decimal:
        """Calculate rate variation based on days ago."""
        # Random walk with mean reversion
        max_variation = self.volatility * (days_ago ** 0.5) / 10
        variation = random.uniform(-max_variation, max_variation)
        return Decimal(str(variation))
    
    def get_historical_rates(
        self,
        from_currency: Currency,
        to_currency: Currency,
        start_date: date,
        end_date: Optional[date] = None,
        frequency: str = "daily",
    ) -> list[FXRate]:
        """
        Get historical rates over a period.
        
        Args:
            from_currency: Source currency
            to_currency: Target currency
            start_date: Start of period
            end_date: End of period (default: today)
            frequency: 'daily', 'weekly', 'monthly'
            
        Returns:
            List of FXRate objects
        """
        end_date = end_date or date.today()
        rates = []
        
        current = start_date
        if frequency == "daily":
            delta = timedelta(days=1)
        elif frequency == "weekly":
            delta = timedelta(weeks=1)
        else:
            delta = timedelta(days=30)
        
        while current <= end_date:
            rates.append(self.get_rate(from_currency, to_currency, current))
            current += delta
        
        return rates


class MultiCurrencySupport:
    """
    Support for multi-currency data generation.
    """
    
    def __init__(
        self,
        fx_provider: Optional[FXRateProvider] = None,
        reporting_currency: Currency = Currency.USD,
    ):
        """Initialize multi-currency support."""
        self.fx_provider = fx_provider or FXRateProvider()
        self.reporting_currency = reporting_currency
        
        # Currency distribution for random selection
        self.currency_weights = {
            Currency.USD: 0.50,
            Currency.EUR: 0.20,
            Currency.GBP: 0.10,
            Currency.CAD: 0.08,
            Currency.AUD: 0.05,
            Currency.JPY: 0.03,
            Currency.CHF: 0.02,
            Currency.INR: 0.01,
            Currency.BRL: 0.005,
            Currency.MXN: 0.005,
        }
    
    def get_random_currency(self) -> Currency:
        """Get a random currency based on distribution."""
        currencies = list(self.currency_weights.keys())
        weights = list(self.currency_weights.values())
        return random.choices(currencies, weights=weights)[0]
    
    def convert_to_reporting(
        self,
        amount: Decimal,
        from_currency: Currency,
        rate_date: Optional[date] = None,
    ) -> tuple[Decimal, FXRate]:
        """
        Convert an amount to reporting currency.
        
        Returns:
            Tuple of (converted amount, fx rate used)
        """
        if from_currency == self.reporting_currency:
            return amount, FXRate(
                from_currency=from_currency,
                to_currency=self.reporting_currency,
                rate=Decimal("1"),
                rate_date=rate_date or date.today(),
            )
        
        rate = self.fx_provider.get_rate(
            from_currency,
            self.reporting_currency,
            rate_date,
        )
        
        return rate.convert(amount), rate
    
    def generate_multi_currency_contract(
        self,
        contract_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Add multi-currency fields to a contract.
        
        Adds:
        - Original currency and amount
        - Reporting currency conversion
        - FX rate used
        """
        currency = Currency(contract_data.get("currency", "USD"))
        arr = Decimal(str(contract_data.get("arr", 0)))
        
        converted_arr, rate = self.convert_to_reporting(
            arr,
            currency,
            contract_data.get("start_date"),
        )
        
        contract_data["original_currency"] = currency.value
        contract_data["original_arr"] = float(arr)
        contract_data["reporting_currency"] = self.reporting_currency.value
        contract_data["reporting_arr"] = float(converted_arr)
        contract_data["fx_rate"] = float(rate.rate)
        contract_data["fx_rate_date"] = rate.rate_date.isoformat()
        
        return contract_data
    
    def generate_fx_gain_loss(
        self,
        original_amount: Decimal,
        original_currency: Currency,
        original_date: date,
        settlement_date: date,
    ) -> dict[str, Any]:
        """
        Calculate FX gain/loss between two dates.
        
        Returns:
            Dictionary with gain/loss details
        """
        original_rate = self.fx_provider.get_rate(
            original_currency,
            self.reporting_currency,
            original_date,
        )
        
        settlement_rate = self.fx_provider.get_rate(
            original_currency,
            self.reporting_currency,
            settlement_date,
        )
        
        original_value = original_rate.convert(original_amount)
        settlement_value = settlement_rate.convert(original_amount)
        
        gain_loss = settlement_value - original_value
        
        return {
            "original_amount": float(original_amount),
            "original_currency": original_currency.value,
            "original_rate": float(original_rate.rate),
            "original_value": float(original_value),
            "settlement_rate": float(settlement_rate.rate),
            "settlement_value": float(settlement_value),
            "fx_gain_loss": float(gain_loss),
            "fx_gain_loss_pct": float(gain_loss / original_value * 100) if original_value else 0,
        }
