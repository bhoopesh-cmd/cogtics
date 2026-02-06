#!/usr/bin/env python3
"""
Generate connector payloads for existing dataset.

This script generates QuickBooks and DocuSign connector payloads
for an existing stress test dataset without regenerating all data.

Usage:
    python generate_connector_payloads.py --input output/stress_test --connectors quickbooks,docusign
"""

import argparse
import json
import logging
import random
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.connectors import QuickBooksPayloadGenerator, DocuSignPayloadGenerator

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ConnectorPayloadGenerator:
    """Generate connector payloads from existing dataset."""

    def __init__(self, input_dir: str, seed: int = 12345):
        self.input_dir = Path(input_dir)
        self.data_dir = self.input_dir / "data"
        self.connectors_dir = self.input_dir / "connectors"
        random.seed(seed)
        self.qb_generator = QuickBooksPayloadGenerator(seed=seed)
        self.ds_generator = DocuSignPayloadGenerator(seed=seed)

        # Load existing data
        self.customers = self._load_json("customers.json")
        self.contracts = self._load_json("contracts.json")
        self.invoices = self._load_json("invoices.json")

        logger.info(f"Loaded {len(self.customers)} customers, {len(self.contracts)} contracts, {len(self.invoices)} invoices")

    def _load_json(self, filename: str) -> List[Dict]:
        """Load JSON file from data directory."""
        filepath = self.data_dir / filename
        if not filepath.exists():
            logger.warning(f"File not found: {filepath}")
            return []
        with open(filepath, 'r') as f:
            return json.load(f)

    def generate_quickbooks(self, output_dir: Path):
        """Generate QuickBooks connector payloads."""
        output_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Generating QuickBooks payloads...")

        # Generate QuickBooks customers
        qb_customers = []
        customer_id_map: Dict[str, str] = {}
        for i, cust in enumerate(self.customers):
            payload = self.qb_generator.generate_customer(cust)
            customer_id_map[cust.get("id")] = payload["Id"]
            qb_customers.append(payload)

        with open(output_dir / "customers.json", "w") as f:
            json.dump(qb_customers, f, indent=2)
        logger.info(f"  Generated {len(qb_customers)} QuickBooks customers")

        # Generate QuickBooks invoices
        qb_invoices = []
        invoice_id_map: Dict[str, str] = {}
        for i, inv in enumerate(self.invoices):
            cust_id = customer_id_map.get(inv.get("customer_id"))
            payload = self.qb_generator.generate_invoice(inv, customer_id=cust_id)
            invoice_id_map[inv.get("id")] = payload["Id"]
            qb_invoices.append(payload)

        with open(output_dir / "invoices.json", "w") as f:
            json.dump(qb_invoices, f, indent=2)
        logger.info(f"  Generated {len(qb_invoices)} QuickBooks invoices")

        # Generate QuickBooks payments
        qb_payments = []
        for i, inv in enumerate(self.invoices):
            if random.random() > 0.3:  # 70% have payments
                cust_id = customer_id_map.get(inv.get("customer_id"))
                inv_id = invoice_id_map.get(inv.get("id"))
                qb_payments.append(self.qb_generator.generate_payment(inv, customer_id=cust_id, invoice_id=inv_id))

        with open(output_dir / "payments.json", "w") as f:
            json.dump(qb_payments, f, indent=2)
        logger.info(f"  Generated {len(qb_payments)} QuickBooks payments")

    def generate_docusign(self, output_dir: Path):
        """Generate DocuSign connector payloads."""
        output_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Generating DocuSign payloads...")

        envelopes = []
        for i, contract in enumerate(self.contracts):
            envelope = self.ds_generator.generate_envelope(contract, signer_email=f"signer{i}@example.com")
            envelope["customFields"] = {
                "textCustomFields": [
                    {"name": "contract_id", "value": contract.get("id", f"contract_{i}")},
                    {"name": "arr", "value": str(contract.get("arr", 0))},
                ]
            }
            envelopes.append(envelope)

        with open(output_dir / "envelopes.json", "w") as f:
            json.dump(envelopes, f, indent=2)
        logger.info(f"  Generated {len(envelopes)} DocuSign envelopes")

    def generate(self, connectors: List[str]):
        """Generate specified connector payloads."""
        for connector in connectors:
            connector = connector.lower().strip()
            output_dir = self.connectors_dir / connector

            if connector == "quickbooks":
                self.generate_quickbooks(output_dir)
            elif connector == "docusign":
                self.generate_docusign(output_dir)
            else:
                logger.warning(f"Unknown connector: {connector}")


def main():
    parser = argparse.ArgumentParser(description="Generate connector payloads for existing dataset")
    parser.add_argument("--input", required=True, help="Input dataset directory (e.g., output/stress_test)")
    parser.add_argument("--connectors", default="quickbooks,docusign", help="Comma-separated list of connectors")
    parser.add_argument("--seed", type=int, default=12345, help="Random seed for reproducibility")

    args = parser.parse_args()

    connectors = [c.strip() for c in args.connectors.split(",")]

    generator = ConnectorPayloadGenerator(args.input, seed=args.seed)
    generator.generate(connectors)

    print("\n" + "=" * 60)
    print("CONNECTOR PAYLOAD GENERATION COMPLETE")
    print("=" * 60)
    print(f"Input directory: {args.input}")
    print(f"Connectors generated: {', '.join(connectors)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
