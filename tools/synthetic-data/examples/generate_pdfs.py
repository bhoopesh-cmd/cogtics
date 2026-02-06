#!/usr/bin/env python3
"""
Generate PDF contracts from existing contracts.json using batched LLM calls.

Usage:
    python generate_pdfs.py --input output/stress_test/data/contracts.json --output output/stress_test/pdfs
    python generate_pdfs.py --input output/stress_test/data/contracts.json --output output/stress_test/pdfs --with-llm
    python generate_pdfs.py --input output/stress_test/data/contracts.json --output output/stress_test/pdfs --limit 50
    python generate_pdfs.py --input output/stress_test/data/contracts.json --output output/stress_test/pdfs --enhanced-templates --skip-existing
"""

import argparse
import json
import logging
import random
import re
import sys
from pathlib import Path
from datetime import date
from typing import List, Dict, Any, Optional

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.llm import LLMClient, HybridContractGenerator
from src.llm.client import SYSTEM_PROMPTS, CLAUSE_DELIMITER
from src.exporters.pdf_export import PDFExporter
from src.models.contracts import Contract, ContractClause, ClauseType
from src.templates import TemplateStore, ContractType, SAAS_STRUCTURE_VARIANTS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Multi-language support
SUPPORTED_LANGUAGES = {
    "en": {
        "name": "English",
        "agreement_intro": "This Agreement is entered into as of",
        "witness_clause": "IN WITNESS WHEREOF, the parties have executed this Agreement.",
        "signature_line": "By:",
        "date_line": "Date:",
        "section_prefix": "Section",
        "article_prefix": "Article",
        "definitions_title": "Definitions",
        "legal_phrases": {
            "shall": ["shall", "will", "must"],
            "pursuant_to": ["pursuant to", "under", "in accordance with"],
            "notwithstanding": ["notwithstanding", "despite", "regardless of"],
            "herein": ["herein", "in this Agreement", "hereunder"],
            "whereas": ["WHEREAS", "RECITALS", "BACKGROUND"],
        }
    },
    "de": {
        "name": "German",
        "agreement_intro": "Dieser Vertrag wird geschlossen am",
        "witness_clause": "ZU URKUND DESSEN haben die Parteien diesen Vertrag unterzeichnet.",
        "signature_line": "Unterschrift:",
        "date_line": "Datum:",
        "section_prefix": "Abschnitt",
        "article_prefix": "Artikel",
        "definitions_title": "Definitionen",
        "legal_phrases": {
            "shall": ["ist verpflichtet", "wird", "muss"],
            "pursuant_to": ["gemäß", "nach Maßgabe von", "entsprechend"],
            "notwithstanding": ["ungeachtet", "trotz", "unbeschadet"],
            "herein": ["hierin", "in diesem Vertrag", "hierunter"],
            "whereas": ["IN ANBETRACHT", "PRÄAMBEL", "ERWÄGUNGEN"],
        }
    },
    "fr": {
        "name": "French",
        "agreement_intro": "Le présent Contrat est conclu en date du",
        "witness_clause": "EN FOI DE QUOI, les parties ont signé le présent Contrat.",
        "signature_line": "Signature:",
        "date_line": "Date:",
        "section_prefix": "Article",
        "article_prefix": "Section",
        "definitions_title": "Définitions",
        "legal_phrases": {
            "shall": ["s'engage à", "doit", "devra"],
            "pursuant_to": ["conformément à", "en vertu de", "selon"],
            "notwithstanding": ["nonobstant", "malgré", "en dépit de"],
            "herein": ["aux présentes", "dans le présent Contrat", "ci-après"],
            "whereas": ["ATTENDU QUE", "PRÉAMBULE", "CONSIDÉRANTS"],
        }
    },
    "es": {
        "name": "Spanish",
        "agreement_intro": "El presente Contrato se celebra con fecha",
        "witness_clause": "EN FE DE LO CUAL, las partes han suscrito el presente Contrato.",
        "signature_line": "Firma:",
        "date_line": "Fecha:",
        "section_prefix": "Cláusula",
        "article_prefix": "Artículo",
        "definitions_title": "Definiciones",
        "legal_phrases": {
            "shall": ["deberá", "se compromete a", "está obligado a"],
            "pursuant_to": ["de conformidad con", "en virtud de", "según"],
            "notwithstanding": ["no obstante", "a pesar de", "sin perjuicio de"],
            "herein": ["en el presente", "en este Contrato", "aquí"],
            "whereas": ["CONSIDERANDO", "ANTECEDENTES", "EXPONE"],
        }
    },
    "ja": {
        "name": "Japanese",
        "agreement_intro": "本契約は以下の日付をもって締結される：",
        "witness_clause": "以上を証するため、両当事者は本契約に署名した。",
        "signature_line": "署名：",
        "date_line": "日付：",
        "section_prefix": "第",
        "article_prefix": "条",
        "definitions_title": "定義",
        "legal_phrases": {
            "shall": ["するものとする", "しなければならない", "する義務を負う"],
            "pursuant_to": ["に従い", "に基づき", "により"],
            "notwithstanding": ["にかかわらず", "を問わず", "に関係なく"],
            "herein": ["本契約において", "本書において", "ここに"],
            "whereas": ["前文", "背景", "経緯"],
        }
    },
    "zh": {
        "name": "Chinese",
        "agreement_intro": "本协议签订日期为",
        "witness_clause": "兹证明，双方已签署本协议。",
        "signature_line": "签字：",
        "date_line": "日期：",
        "section_prefix": "第",
        "article_prefix": "条",
        "definitions_title": "定义",
        "legal_phrases": {
            "shall": ["应当", "须", "有义务"],
            "pursuant_to": ["根据", "依据", "按照"],
            "notwithstanding": ["尽管", "不论", "无论"],
            "herein": ["在本协议中", "于此", "在此"],
            "whereas": ["鉴于", "前言", "背景"],
        }
    },
}


# Standard clause titles for SaaS contracts
SAAS_CLAUSE_TITLES = [
    "Definitions",
    "Services",
    "Fees and Payment",
    "Term and Termination",
    "Confidentiality",
    "Intellectual Property",
    "Warranties",
    "Limitation of Liability",
    "Indemnification",
    "General Provisions",
]

# CUAD clause titles (41) used for full-coverage PDFs
CUAD_CLAUSE_TITLES = [
    "Document Name",
    "Parties",
    "Agreement Date",
    "Effective Date",
    "Expiration Date",
    "Renewal Term",
    "Notice Period To Terminate Renewal",
    "Price Restrictions",
    "Minimum Commitment",
    "Termination For Convenience",
    "Governing Law",
    "License Grant",
    "Non-Transferable License",
    "Irrevocable Or Perpetual License",
    "Unlimited/All-You-Can-Eat-License",
    "Affiliate License-Licensor",
    "Affiliate License-Licensee",
    "Joint Ip Ownership",
    "Ip Ownership Assignment",
    "Cap On Liability",
    "Uncapped Liability",
    "Covenant Not To Sue",
    "Third Party Beneficiary",
    "Audit Rights",
    "Insurance",
    "Source Code Escrow",
    "Post-Termination Services",
    "Warranty Duration",
    "Liquidated Damages",
    "Most Favored Nation",
    "Rofr/Rofo/Rofn",
    "Revenue/Profit Sharing",
    "Volume Restriction",
    "Change Of Control",
    "Anti-Assignment",
    "Exclusivity",
    "Non-Compete",
    "Competitive Restriction Exception",
    "No-Solicit Of Customers",
    "No-Solicit Of Employees",
    "Non-Disparagement",
]


class BatchPDFGenerator:
    """Generate PDFs from contracts using batched LLM calls."""

    def __init__(
        self,
        output_dir: str,
        with_llm: bool = False,
        batch_size: int = 20,
        max_workers: int = 4,
        enhanced_templates: bool = False,
        skip_existing: bool = False,
        llm_realism: bool = False,
        multi_language: bool = False,
        language_distribution: Optional[Dict[str, float]] = None,
    ):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.with_llm = with_llm
        self.batch_size = batch_size
        self.max_workers = max_workers
        self.enhanced_templates = enhanced_templates
        self.skip_existing = skip_existing
        self.multi_language = multi_language
        # Default distribution: 70% English, 30% other languages
        self.language_distribution = language_distribution or {
            "en": 0.70,
            "de": 0.08,
            "fr": 0.08,
            "es": 0.08,
            "ja": 0.03,
            "zh": 0.03,
        }
        self.llm_realism = llm_realism
        # Avoid showing section numbers when LLM realism is enabled
        self.show_numbering = not llm_realism
        
        # Initialize components
        self.llm_client = None
        if with_llm:
            self.llm_client = LLMClient()
            if not self.llm_client.is_configured():
                logger.warning("LLM not configured - using templates only")
                self.llm_client = None
        
        self.template_store = TemplateStore(load_cuad=True)
        self.pdf_exporter = PDFExporter()
        self.structure_variants = list(SAAS_STRUCTURE_VARIANTS.values())
        self.anomaly_assignments: Dict[str, str] = {}
        self.anomalies_manifest: List[Dict[str, Any]] = []
        self.layout_seed = random.randint(1, 1_000_000)
        self.validation_path = self.output_dir / "pdf_validation.jsonl"
        self.validation_seen = self._load_validation_seen()
        self._validation_lock = self._get_validation_lock()
        self.layout_overrides: Dict[str, Dict[str, Any]] = {}
        
        # Stats
        self.pdfs_generated = 0
        self.errors = 0
        self.llm_calls = 0
    
    def load_contracts(self, input_path: str, limit: Optional[int] = None, skip: int = 0) -> List[Dict]:
        """Load contracts from JSON file."""
        with open(input_path, 'r', encoding='utf-8') as f:
            contracts = json.load(f)
        
        total = len(contracts)
        if skip > 0:
            contracts = contracts[skip:]
            logger.info(f"Skipping first {skip} contracts")
        
        if limit:
            contracts = contracts[:limit]
        
        logger.info(f"Loaded {len(contracts)} contracts from {input_path} (total: {total})")
        return contracts
    
    def generate_all_pdfs(
        self,
        contracts: List[Dict],
    ) -> Dict[str, Any]:
        """Generate PDFs for all contracts using batched processing with concurrency."""
        import time
        from concurrent.futures import ThreadPoolExecutor, as_completed

        if self.skip_existing:
            before = len(contracts)
            contracts = [
                c for c in contracts
                if not (self.output_dir / f"{c.get('id')}.pdf").exists()
            ]
            skipped = before - len(contracts)
            if skipped:
                logger.info(f"Skipping {skipped} contracts with existing PDFs")

        if self.enhanced_templates:
            self._prepare_anomaly_assignments(contracts)
        
        total = len(contracts)
        total_batches = (total + self.batch_size - 1) // self.batch_size
        start_time = time.time()
        
        logger.info(f"Generating PDFs for {total} contracts in {total_batches} batches...")
        logger.info(f"LLM enabled: {self.llm_client is not None}, workers: {self.max_workers}")
        
        # Process in batches with progress
        for batch_start in range(0, total, self.batch_size):
            batch_end = min(batch_start + self.batch_size, total)
            batch = contracts[batch_start:batch_end]
            batch_num = batch_start // self.batch_size + 1
            
            elapsed = time.time() - start_time
            if batch_num > 1:
                rate = self.pdfs_generated / elapsed
                eta = (total - self.pdfs_generated) / rate if rate > 0 else 0
                logger.info(f"Batch {batch_num}/{total_batches} ({batch_start + 1}-{batch_end} of {total}) | "
                           f"Generated: {self.pdfs_generated} | Rate: {rate:.1f}/s | ETA: {eta/60:.1f}min")
            else:
                logger.info(f"Batch {batch_num}/{total_batches} ({batch_start + 1}-{batch_end} of {total})")
            
            # Generate clauses for batch (using LLM if enabled)
            batch_clauses = self._generate_batch_clauses(batch)
            batch_titles = [self._select_clause_titles(c) for c in batch]
            batch_records = {}
            for contract_data, titles, clauses in zip(batch, batch_titles, batch_clauses):
                contract_id = contract_data.get("id")
                if not contract_id:
                    continue
                layout = self._build_layout_metadata(contract_data)
                record = self._build_validation_record(
                    contract_data,
                    titles,
                    clauses,
                    layout,
                )
                batch_records[contract_id] = record
            
            # Generate PDFs concurrently
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {}
                for i, contract_data in enumerate(batch):
                    clauses = batch_clauses[i]
                    future = executor.submit(self._generate_single_pdf, contract_data, clauses)
                    futures[future] = contract_data.get('id')
                
                for future in as_completed(futures):
                    contract_id = futures[future]
                    try:
                        future.result()
                        self.pdfs_generated += 1
                        record = batch_records.get(contract_id)
                        if record:
                            self._append_validation_record(contract_id, record)
                    except Exception as e:
                        logger.error(f"Failed to generate PDF for {contract_id}: {e}")
                        self.errors += 1
        
        elapsed = time.time() - start_time

        if self.anomalies_manifest:
            manifest_path = self.output_dir / "pdf_anomalies.json"
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(self.anomalies_manifest, f, indent=2)
            logger.info(f"Wrote anomalies manifest: {manifest_path}")

        return {
            "total_contracts": total,
            "pdfs_generated": self.pdfs_generated,
            "errors": self.errors,
            "output_dir": str(self.output_dir),
            "llm_enabled": self.llm_client is not None,
            "llm_calls": self.llm_calls,
            "anomalies": len(self.anomalies_manifest),
            "validation_records": len(self.validation_seen),
            "elapsed_seconds": round(elapsed, 1),
            "rate_per_second": round(self.pdfs_generated / elapsed, 2) if elapsed > 0 else 0,
        }
    
    def _generate_batch_clauses(
        self,
        contracts: List[Dict],
    ) -> List[List[ContractClause]]:
        """Generate clauses for a batch of contracts."""
        if self.llm_client:
            return self._generate_clauses_with_llm(contracts)
        else:
            return self._generate_clauses_from_templates(contracts)
    
    def _generate_clauses_with_llm(
        self,
        contracts: List[Dict],
    ) -> List[List[ContractClause]]:
        """Generate clauses using batched LLM calls."""
        # Prepare batch requests
        contracts_data = []
        total_clauses = 0
        for contract in contracts:
            contract_id = contract.get("id", "")
            terms = self._extract_terms(contract)
            language = self._select_language(contract_id)
            lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["en"])
            terms["language"] = language
            terms["language_name"] = lang_config["name"]
            clause_titles = self._select_clause_titles(contract)
            templates: Dict[str, str] = {}
            style_hints: Dict[str, str] = {}

            for title in clause_titles:
                clause_type = self._map_title_to_clause_type(title)
                template = self.template_store.get_template(clause_type)
                if template:
                    templates[title] = self.template_store.inject_values(template, terms)
                if self.llm_realism:
                    hint = self._style_hint_for_title(title)
                    if hint:
                        style_hints[title] = hint

            contracts_data.append({
                "contract_type": "saas",
                "terms": terms,
                "clause_titles": clause_titles,
                "templates": templates,
                "style_hints": style_hints,
            })
            total_clauses += len(clause_titles)
        
        # Use batched LLM generation - track calls
        estimated_calls = (total_clauses + 19) // 20  # 20 clauses per batch
        avg_clauses = int(total_clauses / len(contracts)) if contracts else 0
        logger.info(f"  LLM batch: {len(contracts)} contracts × {avg_clauses} clauses = {total_clauses} (~{estimated_calls} API calls)")
        system_prompt = SYSTEM_PROMPTS["contract_clause_realism"] if self.llm_realism else None
        clause_texts = self.llm_client.generate_contracts_batch(contracts_data, system_prompt=system_prompt)
        self.llm_calls += estimated_calls
        
        # Convert to ContractClause objects
        result = []
        for i, contract in enumerate(contracts):
            texts = clause_texts[i] if i < len(clause_texts) else []
            clauses = []
            clause_titles = contracts_data[i]["clause_titles"]
            for j, title in enumerate(clause_titles):
                raw_text = texts[j] if j < len(texts) else self._get_fallback_clause(title, contract)
                text = self._clean_clause_text(title, raw_text)
                clauses.append(ContractClause(
                    id=f"clause_{j}",
                    tenant_id=contract.get("tenant_id", ""),
                    snapshot_id=contract.get("snapshot_id", ""),
                    contract_version_id=contract.get("id", ""),
                    clause_type=ClauseType.SECTION,
                    clause_label=str(j + 1),
                    text=text or self._get_fallback_clause(title, contract),
                    sequence_number=j,
                ))
            result.append(clauses)
        
        return result
    
    def _generate_clauses_from_templates(
        self,
        contracts: List[Dict],
    ) -> List[List[ContractClause]]:
        """Generate clauses from CUAD templates without LLM."""
        result = []
        for contract in contracts:
            terms = self._extract_terms(contract)
            clauses = []

            clause_titles = self._select_clause_titles(contract)
            for j, title in enumerate(clause_titles):
                # Get template and inject values
                clause_type = self._map_title_to_clause_type(title)
                template = self.template_store.get_template(clause_type)

                if template:
                    text = self.template_store.inject_values(template, terms)
                else:
                    text = self._get_fallback_clause(title, contract)

                if self.enhanced_templates:
                    text = self.template_store.inject_variation(text)
                    if not self.llm_client:
                        text = self._inject_structural_stress(title, text, terms)

                # Clean text to remove stray numbering (same as LLM path)
                text = self._clean_clause_text(title, text)

                clauses.append(ContractClause(
                    id=f"clause_{j}",
                    tenant_id=contract.get("tenant_id", ""),
                    snapshot_id=contract.get("snapshot_id", ""),
                    contract_version_id=contract.get("id", ""),
                    clause_type=ClauseType.SECTION,
                    clause_label=str(j + 1),
                    text=text,
                    sequence_number=j,
                ))

            anomaly_type = self.anomaly_assignments.get(contract.get("id"))
            if anomaly_type:
                clauses = self._inject_anomaly(contract, clauses, anomaly_type)
            result.append(clauses)
        
        return result

    def _select_clause_titles(self, contract: Dict) -> List[str]:
        """Select a clause structure for the contract."""
        if not self.enhanced_templates:
            return SAAS_CLAUSE_TITLES

        contract_id = contract.get("id", "")

        # Bucket by size to force clause count variance
        def tier_for(length: int) -> str:
            if length <= 8:
                return "short"
            if length <= 18:
                return "medium"
            return "long"

        buckets = {"short": [], "medium": [], "long": []}
        for structure in self.structure_variants:
            buckets[tier_for(len(structure))].append(structure)

        tier_val = self._stable_hash_percent(f"{contract_id}_tier")
        if tier_val < 15:
            tier = "short"
        elif tier_val < 75:
            tier = "medium"
        else:
            tier = "long"

        candidates = buckets.get(tier) or buckets.get("medium") or self.structure_variants
        variant_index = self._stable_hash_mod(f"{contract_id}_variant", len(candidates))
        structure = candidates[variant_index]

        titles = [section["title"] for section in structure]
        return titles

    def _stable_hash_percent(self, key: str) -> int:
        """Stable 0-99 hash for deterministic sampling."""
        import hashlib
        digest = hashlib.md5(key.encode()).digest()
        return int.from_bytes(digest[:2], "big") % 100

    def _stable_hash_mod(self, key: str, modulus: int) -> int:
        """Stable modulo hash for deterministic selection."""
        import hashlib
        if modulus <= 0:
            return 0
        digest = hashlib.md5(key.encode()).digest()
        return int.from_bytes(digest[:4], "big") % modulus

    def _inject_structural_stress(self, title: str, text: str, terms: Dict[str, Any]) -> str:
        """Add light structure (lists/tables/extra paragraphs) for template-only stress testing."""
        if not text:
            return text

        lower = title.lower()
        arr = terms.get("arr") or 0
        start_date = terms.get("start_date") or "TBD"
        end_date = terms.get("end_date") or "TBD"

        if "fees" in lower or "price" in lower or "payment" in lower or "commitment" in lower:
            if "|" not in text:
                setup_fee = max(int(arr * 0.15), 5000)
                overage_fee = max(int(arr * 0.05), 2500)
                table = (
                    "\n\nPricing Summary:\n"
                    "| Item | Amount | Timing |\n"
                    "|---|---|---|\n"
                    f"| Subscription | ${arr:,.0f} | Annual |\n"
                    f"| Setup | ${setup_fee:,.0f} | One-time |\n"
                    f"| Overages | ${overage_fee:,.0f} | Monthly |\n"
                )
                text = f"{text}{table}"

        if any(key in lower for key in ["termination", "change of control", "audit", "insurance", "notice"]):
            if "- " not in text:
                bullets = (
                    "\n\nOperational Requirements:\n"
                    "- Provide written notice within 30 days.\n"
                    "- Maintain records for at least 24 months.\n"
                    "- Allow reasonable access during business hours.\n"
                )
                text = f"{text}{bullets}"

        if any(key in lower for key in ["warranty", "liability", "indemnification"]):
            if "Notwithstanding" not in text:
                paragraph = (
                    f"\n\nNotwithstanding the foregoing, claims must be brought within 12 months "
                    f"after {end_date}."
                )
                text = f"{text}{paragraph}"

        if "definitions" in lower and len(text) < 500:
            extra = (
                f"\n\nAdditional Terms: \"Effective Date\" means {start_date}; "
                f"\"Term\" means {start_date} to {end_date}."
            )
            text = f"{text}{extra}"

        return text

    def _style_hint_for_title(self, title: str) -> str:
        """Provide a style hint to increase LLM realism."""
        table_hint = "include a short ASCII table with 2-4 rows"
        list_hint = "use numbered subsections (a), (b), (c) and a short bullet list"
        short_hint = "keep to 2-4 sentences with precise definitions"

        mapping = {
            "Document Name": short_hint,
            "Parties": "include defined terms in quotes and a short list of parties/affiliates",
            "Agreement Date": short_hint,
            "Effective Date": short_hint,
            "Expiration Date": short_hint,
            "Renewal Term": list_hint,
            "Notice Period To Terminate Renewal": list_hint,
            "Price Restrictions": table_hint,
            "Minimum Commitment": table_hint,
            "Termination For Convenience": list_hint,
            "Governing Law": short_hint,
            "License Grant": list_hint,
            "Non-Transferable License": short_hint,
            "Irrevocable Or Perpetual License": short_hint,
            "Unlimited/All-You-Can-Eat-License": short_hint,
            "Affiliate License-Licensor": list_hint,
            "Affiliate License-Licensee": list_hint,
            "Joint Ip Ownership": list_hint,
            "Ip Ownership Assignment": list_hint,
            "Cap On Liability": list_hint,
            "Uncapped Liability": list_hint,
            "Covenant Not To Sue": short_hint,
            "Third Party Beneficiary": short_hint,
            "Audit Rights": list_hint,
            "Insurance": list_hint,
            "Source Code Escrow": list_hint,
            "Post-Termination Services": list_hint,
            "Warranty Duration": short_hint,
            "Liquidated Damages": table_hint,
            "Most Favored Nation": short_hint,
            "Rofr/Rofo/Rofn": list_hint,
            "Revenue/Profit Sharing": table_hint,
            "Volume Restriction": table_hint,
            "Change Of Control": list_hint,
            "Anti-Assignment": short_hint,
            "Exclusivity": short_hint,
            "Non-Compete": short_hint,
            "Competitive Restriction Exception": list_hint,
            "No-Solicit Of Customers": short_hint,
            "No-Solicit Of Employees": short_hint,
            "Non-Disparagement": short_hint,
        }
        return mapping.get(title, "")

    def _clean_clause_text(self, title: str, text: str) -> str:
        """Clean LLM clause text to reduce numbering/title bleed."""
        if not text:
            return text

        cleaned = text.strip()

        # Split on ALL delimiters and take only the first segment
        # This handles cases where multiple clauses bleed into one response
        if CLAUSE_DELIMITER in cleaned:
            segments = cleaned.split(CLAUSE_DELIMITER)
            cleaned = segments[0].strip()

        # Remove leading numbering artifacts like "1.", "1. 2.", "Section 3"
        # Note: Use single backslash in raw strings for regex metacharacters
        cleaned = re.sub(r"^(Section\s+\d+\s*[:.\-)]+?\s*)", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"^\d+\s*[.\-)]+\s*", "", cleaned)
        cleaned = re.sub(r"^\d+\s*\.\s*\d+\s*[.\-)]*\s*", "", cleaned)

        # Remove standalone numbering lines at the start (e.g., "1." or "1. 6.")
        cleaned = re.sub(r"^(?:\s*\d+\s*[.\-)]+\s*)+(?=\S)", "", cleaned)
        cleaned = re.sub(r"^(?:\s*\d+\s*[.\-)]+\s*)(?:\n\s*)+", "", cleaned)
        cleaned = re.sub(r"^(?:\s*\d+\s*[.\-)]+\s*)$", "", cleaned)

        # Remove numbering artifacts at the start of any line within the clause body
        cleaned = re.sub(r"(?m)^\s*Section\s+\d+\s*[:.\-)]+?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"(?m)^\s*\d+\s*\.\s*\d+\s*[.\-)]*\s*", "", cleaned)
        cleaned = re.sub(r"(?m)^\s*\d+\s*[.\-)]+\s+", "", cleaned)

        # Remove inline clause-number artifacts (e.g., "the 6. Notice Period")
        cleaned = re.sub(r"\s\d+\.", " ", cleaned)

        # Remove any stray delimiter remnants
        cleaned = cleaned.replace(CLAUSE_DELIMITER, "").strip()

        # Remove duplicated title prefix (case-insensitive)
        if cleaned.lower().startswith(title.lower()):
            cleaned = cleaned[len(title):].lstrip(" .:-")

        # Truncate if another clause title appears later in the text
        # Use looser matching for hyphenated titles (replace hyphens with flexible pattern)
        other_titles = [t for t in CUAD_CLAUSE_TITLES if t != title]
        for other in other_titles:
            # Create pattern that handles hyphens and word boundaries properly
            pattern = re.escape(other).replace(r"\-", r"[\s\-]+")
            match = re.search(rf"(?:^|\s)({pattern})(?:\s|:|$)", cleaned, flags=re.IGNORECASE)
            if match and match.start() > 20:
                cleaned = cleaned[:match.start()].rstrip()
                break

        return cleaned

    def _load_validation_seen(self) -> set:
        """Load already-recorded validation entries."""
        seen = set()
        if not self.validation_path.exists():
            return seen
        try:
            with open(self.validation_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                        cid = record.get("contract_id")
                        if cid:
                            seen.add(cid)
                    except json.JSONDecodeError:
                        continue
        except Exception:
            return seen
        return seen

    def _get_validation_lock(self):
        """Create a lock for validation file writes."""
        import threading
        return threading.Lock()

    def _build_validation_record(
        self,
        contract: Dict,
        titles: List[str],
        clauses: List[ContractClause],
        layout: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Build a validation record for a contract."""
        items = []
        for idx, title in enumerate(titles):
            text = clauses[idx].text if idx < len(clauses) else ""
            items.append({
                "title": title,
                "text": text,
            })
        return {
            "contract_id": contract.get("id"),
            "contract_name": contract.get("name"),
            "layout": layout,
            "clauses": items,
        }

    def _append_validation_record(self, contract_id: str, record: Dict[str, Any]) -> None:
        """Append a validation record to JSONL if not already present."""
        if contract_id in self.validation_seen:
            return
        with self._validation_lock:
            if contract_id in self.validation_seen:
                return
            with open(self.validation_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
            self.validation_seen.add(contract_id)

    def _build_layout_metadata(self, contract: Dict) -> Dict[str, Any]:
        """Build layout metadata for realism-focused PDFs."""
        if not (self.llm_realism or self.enhanced_templates):
            return {}

        contract_id = contract.get("id")
        if contract_id and contract_id in self.layout_overrides:
            return self.layout_overrides[contract_id]

        start_date = contract.get("start_date", "TBD")
        end_date = contract.get("end_date", "TBD")
        arr = contract.get("arr") or 0

        exhibit_titles = [
            "Pricing and Fees",
            "Service Levels (SLA)",
            "Support Plan",
            "Implementation Timeline",
        ]

        exhibit_rows = [
            {"item": "Subscription Fee", "value": f"${arr:,.0f} / year"},
            {"item": "Payment Terms", "value": "Net 30"},
            {"item": "Support Tier", "value": random.choice(["Standard", "Premium", "Enterprise"])},
            {"item": "SLA Uptime", "value": random.choice(["99.5%", "99.9%", "99.0%"])},
        ]

        definitions = [
            {"term": "Effective Date", "definition": str(start_date)},
            {"term": "Term", "definition": f"{start_date} to {end_date}"},
            {"term": "Fees", "definition": f"${arr:,.0f} per annum"},
            {"term": "Services", "definition": "The hosted software services provided by Company"},
        ]

        # Select language for this contract
        language = self._select_language(contract_id)
        lang_config = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["en"])

        layout = {
            "columns": 2 if random.random() < 0.3 else 1,
            "header": random.random() < 0.4,
            "footer": random.random() < 0.4,
            "exhibit": random.random() < 0.25,
            "definitions_table": random.random() < 0.2,
            "show_numbering": self.show_numbering,
            "exhibit_title": random.choice(exhibit_titles),
            "exhibit_rows": exhibit_rows,
            "definitions": definitions,
            # Language settings
            "language": language,
            "language_name": lang_config["name"],
            "agreement_intro": lang_config["agreement_intro"],
            "witness_clause": lang_config["witness_clause"],
            "signature_line": lang_config["signature_line"],
            "date_line": lang_config["date_line"],
            "section_prefix": lang_config["section_prefix"],
            # Font settings based on language
            "font_family": "Noto Sans CJK SC" if language in ["ja", "zh"] else "Arial",
            "text_direction": "ltr",
        }
        if contract_id:
            self.layout_overrides[contract_id] = layout
        return layout

    def _select_language(self, contract_id: str) -> str:
        """Select language for a contract based on distribution."""
        if not self.multi_language:
            return "en"

        # Use deterministic hash (hashlib) for consistent selection across sessions
        import hashlib
        hash_bytes = hashlib.md5((contract_id + "_lang").encode()).digest()
        hash_val = int.from_bytes(hash_bytes[:2], 'big') % 100

        cumulative = 0
        for lang, prob in self.language_distribution.items():
            cumulative += prob * 100
            if hash_val < cumulative:
                return lang
        return "en"

    def _prepare_anomaly_assignments(self, contracts: List[Dict]) -> None:
        """Prepare anomaly assignments for a subset of contracts."""
        total = len(contracts)
        total_anomalies = int(total * 0.1)
        if total_anomalies <= 0:
            return

        anomaly_types = [
            "missing_clause",
            "contradictory_terms",
            "ambiguous_language",
            "formatting_issues",
        ]

        per_type = total_anomalies // len(anomaly_types)
        remainder = total_anomalies % len(anomaly_types)
        assignments = []
        for anomaly in anomaly_types:
            assignments.extend([anomaly] * per_type)
        for i in range(remainder):
            assignments.append(anomaly_types[i % len(anomaly_types)])

        random.shuffle(assignments)
        sample = random.sample(contracts, total_anomalies)
        self.anomaly_assignments = {
            (c.get("id") or f"contract_{i}"): assignments[i]
            for i, c in enumerate(sample)
        }

    def _inject_anomaly(
        self,
        contract: Dict,
        clauses: List[ContractClause],
        anomaly_type: str,
    ) -> List[ContractClause]:
        """Inject an anomaly into the clause set."""
        notes: Dict[str, Any] = {}

        if anomaly_type == "missing_clause" and clauses:
            removed = clauses.pop(random.randrange(len(clauses)))
            notes["removed_clause_label"] = removed.clause_label
        elif anomaly_type == "contradictory_terms" and clauses:
            target = random.choice(clauses)
            conflict_date = contract.get("end_date", "TBD")
            conflict = f"\n\nNotwithstanding the foregoing, the term shall end on {conflict_date}."
            target.text = (target.text or "") + conflict
            notes["target_clause_label"] = target.clause_label
        elif anomaly_type == "ambiguous_language" and clauses:
            for target in random.sample(clauses, min(2, len(clauses))):
                target.text = (target.text or "")
                target.text = target.text.replace("Customer", "the party").replace("Company", "the other party")
                target.text += "\n\nThe obligations will be determined as appropriate."
        elif anomaly_type == "formatting_issues" and clauses:
            target = random.choice(clauses)
            target.text = (target.text or "").replace("\n", " ")
            target.text = f"{target.text}\n\n\n"
            target.clause_label = ""

        self.anomalies_manifest.append({
            "contract_id": contract.get("id"),
            "anomaly_type": anomaly_type,
            "details": notes,
        })

        return clauses
    
    def _extract_terms(self, contract: Dict) -> Dict[str, Any]:
        """Extract terms from contract data."""
        # Get customer name from metadata or use a placeholder
        description = contract.get("metadata", {}).get("description", "")
        customer_name = contract.get("name", "").split(" - ")[0] if " - " in contract.get("name", "") else "Customer"

        start_date = contract.get("start_date")
        end_date = contract.get("end_date")
        if not end_date and start_date:
            end_date = start_date
        
        return {
            "party_a": "Cogtics, Inc.",
            "party_b": customer_name,
            "arr": contract.get("arr", 0),
            "start_date": start_date,
            "end_date": end_date,
            "document_name": contract.get("name", "Agreement"),
            "currency": contract.get("currency", "USD"),
            "billing_frequency": contract.get("billing_frequency", "monthly"),
            "auto_renew": contract.get("auto_renew", False),
            "payment_days": 30,
            "notice_days": random.choice([15, 30, 45, 60]),
            "renewal_period": random.choice(["12 months", "1 year", "24 months"]),
            "percentage": random.choice([3, 5, 7, 10]),
            "interest_rate": random.choice([1.0, 1.5, 2.0]),
            "state": random.choice(["Delaware", "California", "New York", "Texas"]),
            "period": random.choice(["12 months", "6 months", "1 year"]),
            "territory": random.choice(["the United States", "North America", "the Territory"]),
            "services": "the Services",
            "exhibit": random.choice(["A", "B", "C"]),
            "volume": random.choice([1000, 5000, 10000]),
            "amount": f"${random.choice([5000, 10000, 25000]):,}",
            "description": description,
            "contract_id": contract.get("id"),
            "tenant_id": contract.get("tenant_id"),
            "date": start_date or "TBD",
        }
    
    def _map_title_to_clause_type(self, title: str) -> str:
        """Map section title to CUAD clause type."""
        mappings = {
            # Standard SaaS headings - use "_Fallback" suffix to force fallback templates
            # for clause types that don't have good CUAD equivalents
            "Definitions": "Definitions_Fallback",  # CUAD "Parties" is just party names
            "Services": "License_Grant",
            "Fees and Payment": "Payment_Terms",
            "Term and Termination": "Termination",
            "Confidentiality": "Confidentiality",
            "Intellectual Property": "IP_Ownership",
            "Warranties": "Warranties_Fallback",  # No good CUAD equivalent
            "Limitation of Liability": "Liability_Cap",
            "Indemnification": "Indemnification",
            "General Provisions": "Governing_Law",
            "Service Levels": "Warranty_Duration",
            "Audit Rights": "Audit_Rights",
            "Insurance": "Insurance",
            "Source Code Escrow": "Source_Code_Escrow",
            "Change of Control": "Change_Of_Control",
            "Data Protection": "Confidentiality",
            # CUAD clause titles
            "Document Name": "Document_Name",
            "Parties": "Parties",
            "Agreement Date": "Agreement_Date",
            "Effective Date": "Effective_Date",
            "Expiration Date": "Expiration_Date",
            "Renewal Term": "Renewal_Term",
            "Notice Period To Terminate Renewal": "Notice_Period",
            "Price Restrictions": "Price_Restrictions",
            "Minimum Commitment": "Payment_Terms",
            "Termination For Convenience": "Termination",
            "Governing Law": "Governing_Law",
            "License Grant": "License_Grant",
            "Non-Transferable License": "Non_Transferable_License",
            "Irrevocable Or Perpetual License": "Irrevocable_Or_Perpetual_License",
            "Unlimited/All-You-Can-Eat-License": "Unlimited_License",
            "Affiliate License-Licensor": "Affiliate_License_Licensor",
            "Affiliate License-Licensee": "Affiliate_License_Licensee",
            "Joint Ip Ownership": "Joint_IP_Ownership",
            "Ip Ownership Assignment": "IP_Ownership",
            "Cap On Liability": "Liability_Cap",
            "Uncapped Liability": "Uncapped_Liability",
            "Covenant Not To Sue": "Indemnification",
            "Third Party Beneficiary": "Third_Party_Beneficiary",
            "Audit Rights": "Audit_Rights",
            "Insurance": "Insurance",
            "Source Code Escrow": "Source_Code_Escrow",
            "Post-Termination Services": "Post_Termination",
            "Warranty Duration": "Warranty_Duration",
            "Liquidated Damages": "Liquidated_Damages",
            "Most Favored Nation": "MFN",
            "Rofr/Rofo/Rofn": "ROFR",
            "Revenue/Profit Sharing": "Revenue_Sharing",
            "Volume Restriction": "Volume_Restriction",
            "Change Of Control": "Change_Of_Control",
            "Anti-Assignment": "Anti_Assignment",
            "Exclusivity": "Exclusivity",
            "Non-Compete": "Non_Compete",
            "Competitive Restriction Exception": "Competitive_Restriction_Exception",
            "No-Solicit Of Customers": "No_Solicit",
            "No-Solicit Of Employees": "No_Solicit_Employees",
            "Non-Disparagement": "Non_Disparagement",
        }
        return mappings.get(title, "Parties")
    
    def _get_fallback_clause(self, title: str, contract: Dict) -> str:
        """Get fallback clause text when templates unavailable."""
        party_a = "Cogtics, Inc."
        party_b = contract.get("name", "").split(" - ")[0] if " - " in contract.get("name", "") else "Customer"
        arr = contract.get("arr", 0)
        start_date = contract.get("start_date", "TBD")
        end_date = contract.get("end_date", "TBD")
        
        fallbacks = {
            "Definitions": f"""1. DEFINITIONS

1.1 "Agreement" means this Master Service Agreement and all exhibits, schedules, and amendments hereto.

1.2 "Company" means {party_a}.

1.3 "Customer" means {party_b}.

1.4 "Services" means the software services provided by Company to Customer under this Agreement.

1.5 "Effective Date" means {start_date}.
""",
            "Services": f"""2. SERVICES

2.1 Provision of Services. Company shall provide Customer with access to its software-as-a-service platform as described in the applicable Order Form.

2.2 Service Levels. Company shall use commercially reasonable efforts to maintain availability of the Services.

2.3 Updates. Company may update the Services from time to time to enhance functionality and security.
""",
            "Fees and Payment": f"""3. FEES AND PAYMENT

3.1 Fees. Customer shall pay the annual subscription fee of ${arr:,.2f} as set forth in the Order Form.

3.2 Payment Terms. All invoices are due and payable within thirty (30) days of the invoice date.

3.3 Taxes. Fees are exclusive of all taxes. Customer is responsible for all applicable taxes.

3.4 Late Payments. Any amounts not paid when due shall accrue interest at 1.5% per month.
""",
            "Term and Termination": f"""4. TERM AND TERMINATION

4.1 Term. This Agreement commences on {start_date} and continues until {end_date}, unless earlier terminated.

4.2 Termination for Cause. Either party may terminate this Agreement if the other party materially breaches and fails to cure within 30 days of notice.

4.3 Effect of Termination. Upon termination, Customer's access to the Services shall cease immediately.
""",
            "Confidentiality": """5. CONFIDENTIALITY

5.1 Definition. "Confidential Information" means non-public information disclosed by either party.

5.2 Obligations. Each party shall protect the other's Confidential Information using at least the same degree of care used to protect its own confidential information.

5.3 Exceptions. Confidentiality obligations do not apply to information that is publicly available or independently developed.
""",
            "Intellectual Property": """6. INTELLECTUAL PROPERTY

6.1 Company IP. Company retains all rights, title, and interest in the Services and underlying technology.

6.2 Customer Data. Customer retains all rights to its data uploaded to the Services.

6.3 License Grant. Company grants Customer a limited, non-exclusive license to use the Services during the Term.
""",
            "Warranties": """7. WARRANTIES

7.1 Mutual Warranties. Each party warrants that it has the authority to enter into this Agreement.

7.2 Service Warranty. Company warrants that the Services will perform materially as described in the documentation.

7.3 Disclaimer. EXCEPT AS EXPRESSLY PROVIDED, THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
""",
            "Limitation of Liability": f"""8. LIMITATION OF LIABILITY

8.1 Cap. NEITHER PARTY'S TOTAL LIABILITY SHALL EXCEED THE FEES PAID OR PAYABLE IN THE 12 MONTHS PRECEDING THE CLAIM (${arr:,.2f}).

8.2 Exclusions. NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.

8.3 Exceptions. The limitations above do not apply to breaches of confidentiality or intellectual property infringement.
""",
            "Indemnification": """9. INDEMNIFICATION

9.1 Company Indemnification. Company shall defend Customer against claims that the Services infringe third-party intellectual property rights.

9.2 Customer Indemnification. Customer shall defend Company against claims arising from Customer's use of the Services in violation of this Agreement.

9.3 Procedure. The indemnified party must provide prompt notice and reasonable cooperation.
""",
            "General Provisions": """10. GENERAL PROVISIONS

10.1 Governing Law. This Agreement shall be governed by the laws of the State of Delaware.

10.2 Assignment. Neither party may assign this Agreement without the other's prior written consent.

10.3 Entire Agreement. This Agreement constitutes the entire agreement between the parties.

10.4 Amendments. This Agreement may only be modified in writing signed by both parties.

10.5 Notices. All notices shall be in writing and sent to the addresses specified in the Order Form.
""",
        }
        return fallbacks.get(title, f"{title}\n\n[Clause content to be provided]")
    
    def _generate_single_pdf(
        self,
        contract: Dict,
        clauses: List[ContractClause],
    ) -> str:
        """Generate a single PDF."""
        # Create Contract object
        from src.models.contracts import ContractStatus, BillingFrequency
        
        contract_obj = Contract(
            id=contract.get("id", "unknown"),
            tenant_id=contract.get("tenant_id", ""),
            snapshot_id=contract.get("snapshot_id", ""),
            customer_id=contract.get("customer_id", ""),
            external_id=contract.get("external_id", ""),
            name=contract.get("name", "Contract"),
            status=ContractStatus.ACTIVE,
            start_date=date.fromisoformat(contract["start_date"]) if contract.get("start_date") else date.today(),
            end_date=date.fromisoformat(contract["end_date"]) if contract.get("end_date") else date.today(),
            arr=contract.get("arr", 0),
            currency=contract.get("currency", "USD"),
            billing_frequency=BillingFrequency(contract.get("billing_frequency", "monthly")),
            auto_renew=contract.get("auto_renew", False),
            metadata={**contract.get("metadata", {}), "layout": self._build_layout_metadata(contract)},
        )
        
        # Generate PDF
        output_path = self.output_dir / f"{contract['id']}.pdf"
        return self.pdf_exporter.generate_contract_pdf(
            contract_obj,
            clauses,
            str(output_path),
        )


def main():
    parser = argparse.ArgumentParser(description="Generate PDF contracts from contracts.json")
    parser.add_argument("--input", required=True, help="Path to contracts.json")
    parser.add_argument("--output", default="output/pdfs", help="Output directory for PDFs")
    parser.add_argument("--with-llm", action="store_true", help="Use LLM for clause variation (batched)")
    parser.add_argument("--enhanced-templates", action="store_true", help="Enable template variation and anomalies")
    parser.add_argument("--skip-existing", action="store_true", help="Skip contracts with existing PDFs")
    parser.add_argument("--llm-realism", action="store_true", help="Use LLM with realism-focused style hints and layout variation")
    parser.add_argument("--multi-language", action="store_true", help="Generate contracts in multiple languages (EN 70%%, DE/FR/ES 8%% each, JA/ZH 3%% each)")
    parser.add_argument("--limit", type=int, help="Limit number of PDFs to generate")
    parser.add_argument("--skip", type=int, default=0, help="Skip first N contracts")
    parser.add_argument("--batch-size", type=int, default=20, help="Contracts per batch (default: 20)")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent PDF writers (default: 4)")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize generator
    generator = BatchPDFGenerator(
        output_dir=args.output,
        with_llm=args.with_llm,
        batch_size=args.batch_size,
        max_workers=args.workers,
        enhanced_templates=args.enhanced_templates,
        skip_existing=args.skip_existing,
        llm_realism=args.llm_realism,
        multi_language=args.multi_language,
    )
    
    # Load contracts
    contracts = generator.load_contracts(args.input, limit=args.limit, skip=args.skip)
    
    # Generate PDFs
    summary = generator.generate_all_pdfs(contracts)
    
    # Print summary
    print("\n" + "=" * 60)
    print("PDF GENERATION SUMMARY")
    print("=" * 60)
    for key, value in summary.items():
        print(f"  {key}: {value}")
    print("=" * 60)


if __name__ == "__main__":
    main()
