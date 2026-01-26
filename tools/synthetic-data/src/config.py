"""
Configuration module for the synthetic data generator.
Loads environment variables from the repo root .env file.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Find the repo root .env file (go up from tools/synthetic-data to repo root)
# Use resolve() to get absolute path
THIS_FILE = Path(__file__).resolve()
SYNTHETIC_DATA_ROOT = THIS_FILE.parent.parent  # tools/synthetic-data/
REPO_ROOT = SYNTHETIC_DATA_ROOT.parent.parent  # repo root (Tech/)
ENV_FILE = REPO_ROOT / ".env"

# Load environment variables - try multiple locations
loaded = False
for env_path in [
    ENV_FILE,  # Repo root .env
    SYNTHETIC_DATA_ROOT / ".env",  # Local .env in synthetic-data folder
    Path.cwd() / ".env",  # Current working directory
]:
    if env_path.exists():
        load_dotenv(env_path)
        loaded = True
        break

if not loaded:
    # Try loading from environment without file
    load_dotenv()


class Config:
    """Configuration settings loaded from environment."""
    
    # OpenAI settings - use property to ensure env is loaded first
    @property
    def OPENAI_API_KEY(self) -> str:
        return os.getenv("OPENAI_API_KEY", "")
    
    @property
    def OPENAI_MODEL(self) -> str:
        return os.getenv("OPENAI_MODEL", "gpt-5-mini")
    
    # Output settings
    OUTPUT_DIR: Path = Path(__file__).parent.parent / "output"
    
    # Generation defaults
    DEFAULT_TENANT_ID: str = os.getenv("DEV_TENANT_ID", "tenant_01")
    DEFAULT_CURRENCY: str = "USD"
    
    def is_llm_configured(self) -> bool:
        """Check if LLM is properly configured."""
        return bool(self.OPENAI_API_KEY)
    
    @classmethod
    def get_output_path(cls, subdir: str = "") -> Path:
        """Get output path, creating if needed."""
        path = cls.OUTPUT_DIR / subdir if subdir else cls.OUTPUT_DIR
        path.mkdir(parents=True, exist_ok=True)
        return path


# Convenience instance
config = Config()
