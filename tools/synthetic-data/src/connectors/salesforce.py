"""
Salesforce API payload generator.

Generates realistic Salesforce-format data for testing
connector ingestion pipelines.
"""

import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Any, Optional
import uuid


class SalesforcePayloadGenerator:
    """
    Generates Salesforce API-compatible payloads.
    """
    
    def __init__(self, seed: Optional[int] = None):
        """Initialize the generator."""
        if seed is not None:
            random.seed(seed)
    
    def _sf_id(self, prefix: str = "001") -> str:
        """Generate a Salesforce-style 18-character ID."""
        chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        suffix = "".join(random.choices(chars, k=15))
        return f"{prefix}{suffix}"
    
    def _sf_datetime(self, dt: Optional[datetime] = None) -> str:
        """Format datetime for Salesforce."""
        dt = dt or datetime.utcnow()
        return dt.strftime("%Y-%m-%dT%H:%M:%S.000+0000")
    
    def _sf_date(self, d: Optional[date] = None) -> str:
        """Format date for Salesforce."""
        d = d or date.today()
        return d.strftime("%Y-%m-%d")
    
    def generate_account(
        self,
        customer_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate a Salesforce Account object.
        
        Args:
            customer_data: Internal customer data
            
        Returns:
            Salesforce Account payload
        """
        created = datetime.utcnow() - timedelta(days=random.randint(30, 365))
        
        return {
            "attributes": {
                "type": "Account",
                "url": f"/services/data/v58.0/sobjects/Account/{self._sf_id('001')}",
            },
            "Id": self._sf_id("001"),
            "IsDeleted": False,
            "MasterRecordId": None,
            "Name": customer_data.get("name"),
            "Type": random.choice(["Customer - Direct", "Customer - Channel", "Prospect"]),
            "ParentId": None,
            "BillingStreet": customer_data.get("address"),
            "BillingCity": customer_data.get("city"),
            "BillingState": customer_data.get("state"),
            "BillingPostalCode": customer_data.get("zip_code"),
            "BillingCountry": customer_data.get("country", "United States"),
            "ShippingStreet": customer_data.get("address"),
            "ShippingCity": customer_data.get("city"),
            "ShippingState": customer_data.get("state"),
            "ShippingPostalCode": customer_data.get("zip_code"),
            "ShippingCountry": customer_data.get("country", "United States"),
            "Phone": customer_data.get("phone"),
            "Website": customer_data.get("website"),
            "Industry": customer_data.get("industry", "Technology"),
            "AnnualRevenue": float(customer_data.get("annual_revenue", random.randint(1000000, 100000000))),
            "NumberOfEmployees": random.randint(10, 10000),
            "Description": customer_data.get("description"),
            "OwnerId": self._sf_id("005"),
            "CreatedDate": self._sf_datetime(created),
            "CreatedById": self._sf_id("005"),
            "LastModifiedDate": self._sf_datetime(),
            "LastModifiedById": self._sf_id("005"),
            "SystemModstamp": self._sf_datetime(),
            "LastActivityDate": self._sf_date(date.today() - timedelta(days=random.randint(0, 30))),
            "AccountSource": random.choice(["Web", "Phone Inquiry", "Partner Referral", "Trade Show"]),
            "Rating": random.choice(["Hot", "Warm", "Cold"]),
        }
    
    def generate_opportunity(
        self,
        contract_data: dict[str, Any],
        account_id: str,
    ) -> dict[str, Any]:
        """
        Generate a Salesforce Opportunity object.
        
        Args:
            contract_data: Internal contract data
            account_id: Salesforce Account ID
            
        Returns:
            Salesforce Opportunity payload
        """
        start_date = contract_data.get("start_date", date.today())
        close_date = start_date - timedelta(days=random.randint(7, 30))
        
        arr = contract_data.get("arr", Decimal("120000"))
        
        stages = [
            "Prospecting",
            "Qualification",
            "Needs Analysis",
            "Value Proposition",
            "Negotiation/Review",
            "Closed Won",
            "Closed Lost",
        ]
        
        status = contract_data.get("status", "active")
        if status in ["active", "renewed"]:
            stage = "Closed Won"
            is_won = True
            is_closed = True
        elif status == "cancelled":
            stage = "Closed Lost"
            is_won = False
            is_closed = True
        else:
            stage = random.choice(stages[:5])
            is_won = False
            is_closed = False
        
        return {
            "attributes": {
                "type": "Opportunity",
                "url": f"/services/data/v58.0/sobjects/Opportunity/{self._sf_id('006')}",
            },
            "Id": self._sf_id("006"),
            "IsDeleted": False,
            "AccountId": account_id,
            "Name": contract_data.get("name", "New Opportunity"),
            "Description": contract_data.get("description"),
            "StageName": stage,
            "Amount": float(arr),
            "Probability": 100 if is_won else random.randint(10, 90),
            "ExpectedRevenue": float(arr) if is_won else float(arr * Decimal(str(random.random()))),
            "CloseDate": self._sf_date(close_date),
            "Type": "New Customer",
            "NextStep": None if is_closed else "Follow up call",
            "LeadSource": random.choice(["Web", "Partner Referral", "Phone Inquiry", "Trade Show"]),
            "IsClosed": is_closed,
            "IsWon": is_won,
            "ForecastCategory": "Closed" if is_closed else "Pipeline",
            "ForecastCategoryName": "Closed" if is_closed else "Pipeline",
            "HasOpportunityLineItem": True,
            "OwnerId": self._sf_id("005"),
            "CreatedDate": self._sf_datetime(datetime.combine(close_date - timedelta(days=60), datetime.min.time())),
            "CreatedById": self._sf_id("005"),
            "LastModifiedDate": self._sf_datetime(),
            "LastModifiedById": self._sf_id("005"),
            "SystemModstamp": self._sf_datetime(),
            "FiscalQuarter": ((close_date.month - 1) // 3) + 1,
            "FiscalYear": close_date.year,
            "ContactId": self._sf_id("003"),
            "LastActivityDate": self._sf_date(),
        }
    
    def generate_contract(
        self,
        contract_data: dict[str, Any],
        account_id: str,
    ) -> dict[str, Any]:
        """
        Generate a Salesforce Contract object.
        
        Args:
            contract_data: Internal contract data
            account_id: Salesforce Account ID
            
        Returns:
            Salesforce Contract payload
        """
        start_date = contract_data.get("start_date", date.today())
        try:
            if isinstance(start_date, str):
                start_date = date.fromisoformat(start_date.strip()[:10])
        except (ValueError, AttributeError):
            start_date = date.today()
        
        end_date = contract_data.get("end_date")
        if end_date:
            try:
                if isinstance(end_date, str):
                    end_date = date.fromisoformat(end_date.strip()[:10])
            except (ValueError, AttributeError):
                end_date = start_date + timedelta(days=365)
        else:
            end_date = start_date + timedelta(days=365)
        
        status = contract_data.get("status", "active")
        sf_status = "Activated" if status == "active" else "In Approval Process"
        
        return {
            "attributes": {
                "type": "Contract",
                "url": f"/services/data/v58.0/sobjects/Contract/{self._sf_id('800')}",
            },
            "Id": self._sf_id("800"),
            "AccountId": account_id,
            "OwnerExpirationNotice": None,
            "StartDate": self._sf_date(start_date),
            "EndDate": self._sf_date(end_date),
            "BillingStreet": contract_data.get("billing_address"),
            "BillingCity": contract_data.get("billing_city"),
            "BillingState": contract_data.get("billing_state"),
            "BillingPostalCode": contract_data.get("billing_zip"),
            "BillingCountry": contract_data.get("billing_country", "United States"),
            "ContractTerm": contract_data.get("term_months", 12),
            "OwnerId": self._sf_id("005"),
            "Status": sf_status,
            "CompanySignedId": self._sf_id("003"),
            "CompanySignedDate": self._sf_date(start_date - timedelta(days=random.randint(1, 7))),
            "CustomerSignedId": self._sf_id("003"),
            "CustomerSignedDate": self._sf_date(start_date - timedelta(days=random.randint(1, 7))),
            "CustomerSignedTitle": "VP of Procurement",
            "Description": contract_data.get("description"),
            "IsDeleted": False,
            "ContractNumber": contract_data.get("contract_number", f"C-{random.randint(10000, 99999)}"),
            "LastApprovedDate": self._sf_date(start_date),
            "CreatedDate": self._sf_datetime(datetime.combine(start_date - timedelta(days=14), datetime.min.time())),
            "CreatedById": self._sf_id("005"),
            "LastModifiedDate": self._sf_datetime(),
            "LastModifiedById": self._sf_id("005"),
            "SystemModstamp": self._sf_datetime(),
            "LastActivityDate": self._sf_date(),
            "ActivatedById": self._sf_id("005"),
            "ActivatedDate": self._sf_datetime(datetime.combine(start_date, datetime.min.time())),
            "StatusCode": "Activated" if sf_status == "Activated" else "InApproval",
        }
    
    def generate_quote(
        self,
        contract_data: dict[str, Any],
        opportunity_id: str,
        account_id: str,
    ) -> dict[str, Any]:
        """Generate a Salesforce Quote (CPQ) object."""
        arr = contract_data.get("arr", Decimal("120000"))
        
        return {
            "attributes": {
                "type": "SBQQ__Quote__c",
                "url": f"/services/data/v58.0/sobjects/SBQQ__Quote__c/{self._sf_id('a0A')}",
            },
            "Id": self._sf_id("a0A"),
            "OwnerId": self._sf_id("005"),
            "IsDeleted": False,
            "Name": f"Q-{random.randint(10000, 99999)}",
            "SBQQ__Opportunity2__c": opportunity_id,
            "SBQQ__Account__c": account_id,
            "SBQQ__Status__c": "Accepted",
            "SBQQ__Primary__c": True,
            "SBQQ__NetAmount__c": float(arr),
            "SBQQ__ListAmount__c": float(arr * Decimal("1.2")),
            "SBQQ__CustomerDiscount__c": 20.0,
            "SBQQ__SubscriptionTerm__c": contract_data.get("term_months", 12),
            "SBQQ__StartDate__c": self._sf_date(contract_data.get("start_date", date.today())),
            "SBQQ__EndDate__c": self._sf_date(contract_data.get("end_date", date.today() + timedelta(days=365))),
            "SBQQ__ExpirationDate__c": self._sf_date(date.today() + timedelta(days=30)),
            "CreatedDate": self._sf_datetime(),
            "LastModifiedDate": self._sf_datetime(),
        }
