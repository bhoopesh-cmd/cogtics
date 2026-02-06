"""
DocuSign API payload generator.

Generates realistic DocuSign-format data for testing
connector ingestion pipelines.
"""

from __future__ import annotations

import random
from datetime import date, datetime, timedelta
from typing import Any, Optional
import uuid


class DocuSignPayloadGenerator:
    """
    Generates DocuSign API-compatible payloads.
    """

    def __init__(self, seed: Optional[int] = None):
        """Initialize the generator."""
        if seed is not None:
            random.seed(seed)

    def _get(self, data: Any, key: str, default: Any = None) -> Any:
        """Read a field from dicts or objects safely."""
        if isinstance(data, dict):
            return data.get(key, default)
        return getattr(data, key, default)

    def _iso_z(self, dt: datetime) -> str:
        return dt.isoformat() + "Z"

    def _coerce_date(self, value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "")[:19])
            except ValueError:
                return datetime.now()
        return datetime.now()

    def generate_document(
        self,
        contract_data: Any,
        document_id: str = "1",
        order: str = "1",
    ) -> dict[str, Any]:
        """Generate a DocuSign Document metadata object."""
        name = self._get(contract_data, "name", "Agreement")
        return {
            "documentId": document_id,
            "name": f"{name}.pdf",
            "type": "content",
            "uri": f"/envelopes/{uuid.uuid4()}/documents/{document_id}",
            "order": order,
            "pages": str(random.randint(2, 15)),
        }

    def generate_envelope(
        self,
        contract_data: Any,
        signer_email: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Generate a DocuSign Envelope object.

        Args:
            contract_data: Internal contract data
            signer_email: Optional signer email override

        Returns:
            DocuSign Envelope payload
        """
        status_map = {
            "active": "completed",
            "renewed": "completed",
            "expired": "completed",
            "cancelled": "voided",
            "draft": "created",
            "pending": "sent",
        }

        contract_status = str(self._get(contract_data, "status", "active"))
        ds_status = status_map.get(contract_status, "completed")

        start_dt = self._coerce_date(self._get(contract_data, "start_date"))
        created_time = start_dt - timedelta(days=random.randint(1, 30))
        sent_time = created_time + timedelta(hours=random.randint(1, 24))
        completed_time = sent_time + timedelta(days=random.randint(1, 7)) if ds_status == "completed" else None

        envelope_id = str(uuid.uuid4())
        signer = signer_email or f"signer{random.randint(1, 9999)}@example.com"

        return {
            "envelopeId": envelope_id,
            "status": ds_status,
            "emailSubject": f"Please sign: {self._get(contract_data, 'name', 'Agreement')}",
            "createdDateTime": self._iso_z(created_time),
            "sentDateTime": self._iso_z(sent_time),
            "completedDateTime": self._iso_z(completed_time) if completed_time else None,
            "initialSentDateTime": self._iso_z(sent_time),
            "statusChangedDateTime": self._iso_z(completed_time or sent_time),
            "documentsUri": f"/envelopes/{envelope_id}/documents",
            "recipientsUri": f"/envelopes/{envelope_id}/recipients",
            "envelopeUri": f"/envelopes/{envelope_id}",
            "documents": [self.generate_document(contract_data)],
            "recipients": {
                "signers": [
                    {
                        "recipientId": "1",
                        "recipientIdGuid": str(uuid.uuid4()),
                        "name": "Contract Signer",
                        "email": signer,
                        "status": "completed" if ds_status == "completed" else "sent",
                        "signedDateTime": self._iso_z(completed_time) if completed_time else None,
                        "routingOrder": "1",
                    }
                ],
            },
        }
