"""
OpenAI LLM client for text synthesis with batching support.
"""

import logging
import json
from typing import Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

from ..config import config

logger = logging.getLogger(__name__)


class LLMClient:
    """
    OpenAI client wrapper for generating contract text with batching support.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_workers: int = 5,
    ):
        """
        Initialize the LLM client.
        
        Args:
            api_key: OpenAI API key (defaults to config)
            model: Model to use (defaults to config)
            max_workers: Max concurrent requests for parallel batching
        """
        self.api_key = api_key or config.OPENAI_API_KEY
        self.model = model or config.OPENAI_MODEL
        self.max_workers = max_workers
        self._client = None
    
    def _get_client(self):
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key)
            except ImportError:
                logger.error(
                    "OpenAI package not installed. "
                    "Install with: pip install openai"
                )
                raise
        return self._client
    
    def is_configured(self) -> bool:
        """Check if the client is properly configured."""
        return bool(self.api_key)
    
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate text from a prompt.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text
        """
        if not self.is_configured():
            logger.warning("LLM not configured, returning empty string")
            return ""
        
        try:
            client = self._get_client()
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Some models (like gpt-5-mini) only support temperature=1
            # For those, omit the temperature parameter entirely
            create_params = {
                "model": self.model,
                "messages": messages,
                "max_completion_tokens": max_tokens,
            }
            # Only add temperature if not using a model with fixed temperature
            if "gpt-5" not in self.model.lower():
                create_params["temperature"] = temperature
            
            response = client.chat.completions.create(**create_params)
            
            return response.choices[0].message.content or ""
            
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return ""
    
    def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> dict[str, Any]:
        """
        Generate JSON response from a prompt.
        
        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Sampling temperature
            
        Returns:
            Parsed JSON as dictionary
        """
        if not self.is_configured():
            return {}
        
        try:
            import json
            client = self._get_client()
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Some models (like gpt-5-mini) only support temperature=1
            create_params = {
                "model": self.model,
                "messages": messages,
                "response_format": {"type": "json_object"},
            }
            if "gpt-5" not in self.model.lower():
                create_params["temperature"] = temperature
            
            response = client.chat.completions.create(**create_params)
            
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
            
        except Exception as e:
            logger.error(f"LLM JSON generation failed: {e}")
            return {}
    
    async def agenerate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """
        Async version of generate.
        """
        # For now, just call sync version
        # Can be updated to use async client if needed
        return self.generate(prompt, system_prompt, temperature, max_tokens)
    
    def generate_batch(
        self,
        prompts: list[str],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> list[str]:
        """
        Generate text for multiple prompts in parallel.
        
        Args:
            prompts: List of user prompts
            system_prompt: Optional system prompt (same for all)
            temperature: Sampling temperature
            max_tokens: Max tokens per response
            
        Returns:
            List of generated texts (same order as prompts)
        """
        if not self.is_configured():
            logger.warning("LLM not configured, returning empty strings")
            return [""] * len(prompts)
        
        if not prompts:
            return []
        
        results = [""] * len(prompts)
        
        def generate_single(idx: int, prompt: str) -> tuple[int, str]:
            result = self.generate(prompt, system_prompt, temperature, max_tokens)
            return idx, result
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(generate_single, i, p): i 
                for i, p in enumerate(prompts)
            }
            
            for future in as_completed(futures):
                try:
                    idx, result = future.result()
                    results[idx] = result
                except Exception as e:
                    logger.error(f"Batch generation failed for prompt {futures[future]}: {e}")
        
        return results
    
    def generate_all_clauses(
        self,
        clause_requests: list[dict[str, Any]],
        system_prompt: Optional[str] = None,
    ) -> list[str]:
        """
        Generate all clauses in a single batched API call using JSON mode.
        
        Each clause_request should have:
        - title: The clause title/type
        - terms: Contract terms dict
        - template: Optional base template to rephrase
        
        Args:
            clause_requests: List of clause generation requests
            system_prompt: System prompt for clause generation
            
        Returns:
            List of generated clause texts
        """
        if not self.is_configured():
            return [""] * len(clause_requests)
        
        if not clause_requests:
            return []
        
        # Build a single prompt asking for all clauses at once
        clauses_spec = []
        for i, req in enumerate(clause_requests):
            spec = {
                "index": i,
                "title": req.get("title", f"Section {i+1}"),
            }
            if req.get("template"):
                spec["base_text"] = req["template"][:500]  # Truncate for context
            if req.get("terms"):
                terms = req["terms"]
                spec["context"] = {
                    "party_a": terms.get("party_a", "Company"),
                    "party_b": terms.get("party_b", "Customer"),
                    "arr": terms.get("arr"),
                    "start_date": str(terms.get("start_date", "")),
                    "end_date": str(terms.get("end_date", "")),
                }
            clauses_spec.append(spec)
        
        prompt = f"""Generate {len(clause_requests)} contract clauses for a commercial software/SaaS agreement.

For each clause specification below, generate professional, legally sound text.
If a base_text is provided, rephrase it while maintaining legal meaning.
Include specific values from the context where relevant.

Clause specifications:
{json.dumps(clauses_spec, indent=2)}

Return a JSON object with a "clauses" array containing objects with "index" and "text" fields.
Example: {{"clauses": [{{"index": 0, "text": "1. DEFINITIONS..."}}, ...]}}"""

        result = self.generate_json(
            prompt,
            system_prompt=system_prompt or SYSTEM_PROMPTS["contract_clause"],
        )
        
        # Parse results
        clauses = result.get("clauses", [])
        output = [""] * len(clause_requests)
        
        for clause in clauses:
            idx = clause.get("index", -1)
            if 0 <= idx < len(output):
                output[idx] = clause.get("text", "")
        
        return output
    
    def generate_contracts_batch(
        self,
        contracts_data: list[dict[str, Any]],
    ) -> list[list[str]]:
        """
        Generate clauses for multiple contracts in batched API calls.
        
        Groups contracts and generates all their clauses efficiently.
        
        Args:
            contracts_data: List of contract data, each containing:
                - contract_type: Type of contract
                - terms: Contract terms dict
                - clause_titles: List of clause titles to generate
                
        Returns:
            List of lists of clause texts (one list per contract)
        """
        if not self.is_configured():
            return [[""] * len(c.get("clause_titles", [])) for c in contracts_data]
        
        # Flatten all clause requests with contract tracking
        all_requests = []
        contract_indices = []  # Track which contract each request belongs to
        
        for contract_idx, contract in enumerate(contracts_data):
            terms = contract.get("terms", {})
            for title in contract.get("clause_titles", []):
                all_requests.append({
                    "title": title,
                    "terms": terms,
                    "template": contract.get("templates", {}).get(title),
                })
                contract_indices.append(contract_idx)
        
        if not all_requests:
            return [[] for _ in contracts_data]
        
        # Process in batches of 20 clauses per API call
        BATCH_SIZE = 20
        all_results = [""] * len(all_requests)
        
        for batch_start in range(0, len(all_requests), BATCH_SIZE):
            batch_end = min(batch_start + BATCH_SIZE, len(all_requests))
            batch = all_requests[batch_start:batch_end]
            
            logger.info(f"Generating clauses batch {batch_start//BATCH_SIZE + 1} ({len(batch)} clauses)")
            
            batch_results = self.generate_all_clauses(batch)
            
            for i, result in enumerate(batch_results):
                all_results[batch_start + i] = result
        
        # Reorganize results by contract
        output = [[] for _ in contracts_data]
        for req_idx, contract_idx in enumerate(contract_indices):
            output[contract_idx].append(all_results[req_idx])
        
        return output


# Singleton instance
_llm_client: Optional[LLMClient] = None


def get_llm_client() -> LLMClient:
    """Get or create the global LLM client instance."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client


# Contract generation prompts
SYSTEM_PROMPTS = {
    "contract_clause": """You are a legal document specialist who writes commercial contract clauses.
Generate professional, legally sound contract language.
Use formal legal terminology and standard clause structures.
Include specific values and dates where placeholders are indicated.""",

    "invoice_description": """You are a billing specialist who writes invoice line item descriptions.
Generate clear, professional invoice text that describes products and services.
Be specific about what is being billed and the billing period.""",

    "crm_notes": """You are a sales representative writing notes about customer interactions.
Write realistic, informal notes that capture the essence of business conversations.
Include occasional typos, abbreviations, and informal language for realism.""",

    "contract_rephrase": """You are a legal editor who rephrases contract clauses.
Maintain the same legal meaning but vary the wording and structure.
Keep the professional tone and include all specific values.""",
}
