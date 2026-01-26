"""
LLM synthesis layer for generating realistic text.
"""

from .client import LLMClient, get_llm_client
from .contracts import HybridContractGenerator
from .invoices import InvoiceTextGenerator
from .crm import CRMNotesGenerator

__all__ = [
    "LLMClient",
    "get_llm_client",
    "HybridContractGenerator",
    "InvoiceTextGenerator",
    "CRMNotesGenerator",
]
