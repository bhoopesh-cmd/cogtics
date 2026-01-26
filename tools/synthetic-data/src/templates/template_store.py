"""
Template storage and caching for contract templates.
"""

import json
import logging
from pathlib import Path
from typing import Any, Optional

from .cuad_loader import CUADLoader, get_cuad_loader
from .clause_extractor import ClauseExtractor, CLAUSE_TYPES
from .contract_types import ContractType, DEFAULT_STRUCTURE

logger = logging.getLogger(__name__)


class TemplateStore:
    """
    Stores and manages contract clause templates.
    
    Provides caching and lazy loading of templates from CUAD
    or fallback templates.
    """
    
    def __init__(
        self,
        cache_dir: Optional[Path] = None,
        load_cuad: bool = True
    ):
        """
        Initialize the template store.
        
        Args:
            cache_dir: Directory to cache processed templates
            load_cuad: Whether to load CUAD dataset
        """
        self.cache_dir = cache_dir
        self._cuad_loader: Optional[CUADLoader] = None
        self._extractor: Optional[ClauseExtractor] = None
        self._templates: dict[str, list[str]] = {}
        self._loaded = False
        
        if load_cuad:
            self._initialize_cuad()
    
    def _initialize_cuad(self) -> None:
        """Initialize CUAD loader and extractor."""
        try:
            self._cuad_loader = get_cuad_loader()
            if self._cuad_loader.load():
                self._extractor = ClauseExtractor(self._cuad_loader)
                logger.info("CUAD dataset loaded successfully")
            else:
                logger.warning("Failed to load CUAD, using fallback templates")
                self._extractor = ClauseExtractor()
        except Exception as e:
            logger.warning(f"Error initializing CUAD: {e}, using fallbacks")
            self._extractor = ClauseExtractor()
    
    def load_templates(self) -> None:
        """Load all templates into memory."""
        if self._loaded:
            return
        
        # Try to load from cache first
        if self.cache_dir and self._load_from_cache():
            self._loaded = True
            return
        
        # Extract from CUAD or use fallbacks
        if self._extractor:
            self._templates = self._extractor.extract_templates()
        
        # Save to cache
        if self.cache_dir:
            self._save_to_cache()
        
        self._loaded = True
    
    def _load_from_cache(self) -> bool:
        """Load templates from cache file."""
        if not self.cache_dir:
            return False
        
        cache_file = Path(self.cache_dir) / "templates.json"
        if not cache_file.exists():
            return False
        
        try:
            with open(cache_file, "r") as f:
                self._templates = json.load(f)
            logger.info(f"Loaded templates from cache: {cache_file}")
            return True
        except Exception as e:
            logger.warning(f"Failed to load cache: {e}")
            return False
    
    def _save_to_cache(self) -> None:
        """Save templates to cache file."""
        if not self.cache_dir:
            return
        
        cache_dir = Path(self.cache_dir)
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = cache_dir / "templates.json"
        
        try:
            with open(cache_file, "w") as f:
                json.dump(self._templates, f, indent=2)
            logger.info(f"Saved templates to cache: {cache_file}")
        except Exception as e:
            logger.warning(f"Failed to save cache: {e}")
    
    def get_template(
        self,
        clause_type: str,
        random: bool = True
    ) -> Optional[str]:
        """
        Get a clause template.
        
        Args:
            clause_type: Type of clause
            random: If True, return random template; else return first
            
        Returns:
            Template text
        """
        if not self._loaded:
            self.load_templates()
        
        if self._extractor:
            return self._extractor.get_template(clause_type)
        
        templates = self._templates.get(clause_type, [])
        if not templates:
            return None
        
        if random:
            import random as rand
            return rand.choice(templates)
        return templates[0]
    
    def get_contract_structure(
        self,
        contract_type: ContractType
    ) -> list[dict[str, Any]]:
        """
        Get the default structure for a contract type.
        
        Args:
            contract_type: Type of contract
            
        Returns:
            List of section definitions
        """
        return DEFAULT_STRUCTURE.get(contract_type, [])
    
    def get_all_clause_types(self) -> list[str]:
        """Get all available clause types."""
        return CLAUSE_TYPES.copy()
    
    def inject_values(
        self,
        template: str,
        values: dict[str, Any]
    ) -> str:
        """
        Inject values into a template.
        
        Args:
            template: Template with placeholders
            values: Values to inject
            
        Returns:
            Filled template
        """
        if self._extractor:
            return self._extractor.inject_values(template, values)
        
        result = template
        for key, value in values.items():
            placeholder = f"[{key.upper()}]"
            result = result.replace(placeholder, str(value))
        return result
    
    def is_cuad_available(self) -> bool:
        """Check if CUAD dataset is available."""
        return (
            self._cuad_loader is not None 
            and self._cuad_loader.is_loaded()
        )
    
    def get_cuad_stats(self) -> dict[str, Any]:
        """Get statistics about loaded CUAD data."""
        if not self._cuad_loader or not self._cuad_loader.is_loaded():
            return {"loaded": False}
        
        return {
            "loaded": True,
            "contract_count": self._cuad_loader.get_contract_count(),
            "clause_types": len(self._cuad_loader.get_clause_types()),
        }
