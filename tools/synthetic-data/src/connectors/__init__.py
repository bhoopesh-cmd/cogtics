"""
Raw connector payload generators for source systems.
"""

from .stripe import StripePayloadGenerator
from .salesforce import SalesforcePayloadGenerator
from .hubspot import HubSpotPayloadGenerator
from .quickbooks import QuickBooksPayloadGenerator
from .docusign import DocuSignPayloadGenerator

__all__ = [
    "StripePayloadGenerator",
    "SalesforcePayloadGenerator",
    "HubSpotPayloadGenerator",
    "QuickBooksPayloadGenerator",
    "DocuSignPayloadGenerator",
]
