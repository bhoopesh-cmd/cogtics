"""
CUAD dataset loader for extracting real contract templates.

CUAD (Contract Understanding Atticus Dataset) contains 500+ real commercial
contracts with 13,000+ annotated clauses across 41 clause types.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Default path to local CUAD JSON file (relative to repo root)
DEFAULT_LOCAL_CUAD_PATH = "CUAD_v1/CUAD_v1/CUAD_v1.json"

# CUAD clause type annotations
CUAD_CLAUSE_TYPES = [
    "Document Name",
    "Parties",
    "Agreement Date",
    "Effective Date",
    "Expiration Date",
    "Renewal Term",
    "Notice Period To Terminate Renewal",
    "Governing Law",
    "Most Favored Nation",
    "Non-Compete",
    "Exclusivity",
    "No-Solicit Of Customers",
    "No-Solicit Of Employees",
    "Non-Disparagement",
    "Termination For Convenience",
    "Rofr/Rofo/Rofn",
    "Change Of Control",
    "Anti-Assignment",
    "Revenue/Profit Sharing",
    "Price Restrictions",
    "Minimum Commitment",
    "Volume Restriction",
    "Ip Ownership Assignment",
    "Joint Ip Ownership",
    "License Grant",
    "Non-Transferable License",
    "Affiliate License-Licensor",
    "Affiliate License-Licensee",
    "Unlimited/All-You-Can-Eat-License",
    "Irrevocable Or Perpetual License",
    "Source Code Escrow",
    "Post-Termination Services",
    "Audit Rights",
    "Uncapped Liability",
    "Cap On Liability",
    "Liquidated Damages",
    "Warranty Duration",
    "Insurance",
    "Covenant Not To Sue",
    "Third Party Beneficiary",
]


class CUADLoader:
    """
    Loader for the CUAD dataset.
    
    Provides access to real contract text and clause annotations
    for generating realistic synthetic contracts.
    """
    
    def __init__(self, local_path: Optional[str] = None, cache_dir: Optional[str] = None):
        """
        Initialize the CUAD loader.
        
        Args:
            local_path: Optional path to local CUAD JSON file
            cache_dir: Optional directory to cache the dataset (for HF fallback)
        """
        self.local_path = local_path
        self.cache_dir = cache_dir
        self._dataset = None
        self._contracts: list[dict[str, Any]] = []
        self._clause_index: dict[str, list[str]] = {}
    
    def _find_local_cuad(self) -> Optional[str]:
        """Find the local CUAD JSON file."""
        # Check explicit path first
        if self.local_path and os.path.exists(self.local_path):
            return self.local_path
        
        # Try to find it relative to repo root
        # Walk up from this file to find the repo root
        current = Path(__file__).resolve()
        for _ in range(10):  # Max 10 levels up
            current = current.parent
            candidate = current / DEFAULT_LOCAL_CUAD_PATH
            if candidate.exists():
                return str(candidate)
            # Also check if we're in the Tech directory
            if (current / "CUAD_v1").exists():
                candidate = current / "CUAD_v1" / "CUAD_v1" / "CUAD_v1.json"
                if candidate.exists():
                    return str(candidate)
        
        return None
    
    def load(self) -> bool:
        """
        Load the CUAD dataset from local file or Hugging Face.
        
        Returns:
            True if loaded successfully, False otherwise
        """
        # Try local file first
        local_path = self._find_local_cuad()
        if local_path:
            try:
                logger.info(f"Loading CUAD dataset from local file: {local_path}")
                with open(local_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                self._process_squad_format(data)
                logger.info(f"Loaded {len(self._contracts)} contracts from local CUAD")
                return True
            except Exception as e:
                logger.warning(f"Failed to load local CUAD file: {e}")
        
        # Fall back to Hugging Face
        try:
            from datasets import load_dataset
            
            logger.info("Loading CUAD dataset from Hugging Face...")
            
            # Try multiple dataset names/configurations
            dataset_attempts = [
                {"path": "theatticusproject/cuad-qa", "name": None},
                {"path": "cuad", "name": None},
            ]
            
            for attempt in dataset_attempts:
                try:
                    self._dataset = load_dataset(
                        attempt["path"],
                        attempt.get("name"),
                        cache_dir=self.cache_dir,
                    )
                    self._process_hf_dataset()
                    logger.info(f"Loaded {len(self._contracts)} contracts from CUAD (HF)")
                    return True
                except Exception as e:
                    logger.debug(f"Failed to load {attempt['path']}: {e}")
                    continue
            
            logger.warning("Could not load CUAD dataset, using fallback templates")
            return False
            
        except ImportError:
            logger.warning(
                "datasets package not installed. "
                "Install with: pip install datasets"
            )
            return False
        except Exception as e:
            logger.error(f"Failed to load CUAD dataset: {e}")
            return False
    
    def _process_squad_format(self, data: dict) -> None:
        """Process the SQuAD 2.0 format JSON file."""
        articles = data.get("data", [])
        
        for article in articles:
            title = article.get("title", "")
            paragraphs = article.get("paragraphs", [])
            
            # Combine all paragraphs into one context
            full_context = ""
            clauses: dict[str, list[str]] = {}
            
            for para in paragraphs:
                context = para.get("context", "")
                full_context += context + "\n\n"
                
                # Extract QA pairs (clause annotations)
                for qa in para.get("qas", []):
                    question = qa.get("question", "")
                    answers = qa.get("answers", [])
                    is_impossible = qa.get("is_impossible", False)
                    
                    if is_impossible or not answers:
                        continue
                    
                    # Extract clause type from question
                    clause_type = self._extract_clause_type(question)
                    if clause_type:
                        if clause_type not in clauses:
                            clauses[clause_type] = []
                        
                        for ans in answers:
                            text = ans.get("text", "").strip()
                            if text and len(text) > 10:  # Skip very short answers
                                clauses[clause_type].append(text)
                                
                                # Add to global index
                                if clause_type not in self._clause_index:
                                    self._clause_index[clause_type] = []
                                self._clause_index[clause_type].append(text)
            
            if full_context.strip():
                self._contracts.append({
                    "id": title,
                    "title": title,
                    "context": full_context.strip(),
                    "clauses": clauses,
                })
    
    def _extract_clause_type(self, question: str) -> Optional[str]:
        """Extract clause type from CUAD question format."""
        # CUAD questions are like: 'Highlight the parts (if any) of this contract 
        # related to "Document Name" that should be reviewed by a lawyer.'
        for clause_type in CUAD_CLAUSE_TYPES:
            if clause_type.lower() in question.lower():
                return clause_type
        return None
    
    def _process_hf_dataset(self) -> None:
        """Process the Hugging Face dataset format."""
        if self._dataset is None:
            return
        
        # CUAD has train/test splits, we use all
        for split in ["train", "test"]:
            if split not in self._dataset:
                continue
            
            for item in self._dataset[split]:
                contract = {
                    "id": item.get("id", ""),
                    "title": item.get("title", ""),
                    "context": item.get("context", ""),
                    "clauses": {},
                }
                
                # Extract annotated clauses
                for clause_type in CUAD_CLAUSE_TYPES:
                    key = clause_type.lower().replace(" ", "_").replace("-", "_")
                    answers = item.get("answers", {})
                    
                    if key in answers and answers[key]:
                        contract["clauses"][clause_type] = answers[key]
                        
                        if clause_type not in self._clause_index:
                            self._clause_index[clause_type] = []
                        self._clause_index[clause_type].extend(answers[key])
                
                if contract["context"]:
                    self._contracts.append(contract)
    
    def is_loaded(self) -> bool:
        """Check if dataset is loaded."""
        return len(self._contracts) > 0
    
    def get_contracts(self) -> list[dict[str, Any]]:
        """Get all loaded contracts."""
        return self._contracts
    
    def get_contract_count(self) -> int:
        """Get number of loaded contracts."""
        return len(self._contracts)
    
    def get_clauses_by_type(self, clause_type: str) -> list[str]:
        """
        Get all clause examples of a specific type.
        
        Args:
            clause_type: One of the CUAD clause types
            
        Returns:
            List of clause text examples
        """
        return self._clause_index.get(clause_type, [])
    
    def get_random_clause(
        self,
        clause_type: str,
        fallback: Optional[str] = None
    ) -> Optional[str]:
        """
        Get a random clause of the specified type.
        
        Args:
            clause_type: One of the CUAD clause types
            fallback: Fallback text if no clauses found
            
        Returns:
            Random clause text or fallback
        """
        import random
        
        clauses = self.get_clauses_by_type(clause_type)
        if clauses:
            return random.choice(clauses)
        return fallback
    
    def get_contract_text(self, index: int = 0) -> Optional[str]:
        """
        Get full contract text by index.
        
        Args:
            index: Contract index
            
        Returns:
            Full contract text
        """
        if 0 <= index < len(self._contracts):
            return self._contracts[index].get("context")
        return None
    
    def search_contracts(self, keyword: str) -> list[dict[str, Any]]:
        """
        Search contracts containing a keyword.
        
        Args:
            keyword: Keyword to search for
            
        Returns:
            List of matching contracts
        """
        keyword_lower = keyword.lower()
        return [
            c for c in self._contracts
            if keyword_lower in c.get("context", "").lower()
            or keyword_lower in c.get("title", "").lower()
        ]
    
    def get_clause_types(self) -> list[str]:
        """Get list of available clause types."""
        return list(self._clause_index.keys())
    
    def build_template_index(self) -> dict[str, list[str]]:
        """
        Build an index of clause templates by type.
        
        Returns:
            Dictionary mapping clause types to example texts
        """
        return self._clause_index.copy()


# Singleton instance for convenience
_cuad_loader: Optional[CUADLoader] = None


def get_cuad_loader() -> CUADLoader:
    """Get or create the global CUAD loader instance."""
    global _cuad_loader
    if _cuad_loader is None:
        _cuad_loader = CUADLoader()
    return _cuad_loader
