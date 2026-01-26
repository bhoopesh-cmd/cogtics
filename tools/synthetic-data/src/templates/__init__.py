"""
CUAD dataset integration for real contract templates.
"""

from .cuad_loader import CUADLoader
from .clause_extractor import ClauseExtractor, CLAUSE_TYPES
from .template_store import TemplateStore
from .contract_types import ContractType, CONTRACT_TYPE_MAPPINGS

__all__ = [
    "CUADLoader",
    "ClauseExtractor",
    "CLAUSE_TYPES",
    "TemplateStore",
    "ContractType",
    "CONTRACT_TYPE_MAPPINGS",
]
