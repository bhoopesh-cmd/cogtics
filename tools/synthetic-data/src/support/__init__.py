"""
Faker-based support layer for generating IDs, timestamps, and contact info.
"""

from .generators import (
    FakerSupport,
    generate_ids,
    generate_customer,
    generate_timestamps,
    generate_contact_info,
)

__all__ = [
    "FakerSupport",
    "generate_ids",
    "generate_customer",
    "generate_timestamps",
    "generate_contact_info",
]
