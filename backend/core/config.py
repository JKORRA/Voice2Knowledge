import os
from pydantic_settings import BaseSettings
from platformdirs import user_data_dir
from pathlib import Path

APP_NAME = "Voice2Knowledge"
APP_AUTHOR = "Voice2Knowledge"

# OS-specific application data directory
APP_DATA_DIR = Path(user_data_dir(APP_NAME, APP_AUTHOR))
APP_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Set HF_HOME so huggingface hub downloads models here
os.environ["HF_HOME"] = str(APP_DATA_DIR / "huggingface")

class Settings(BaseSettings):
    default_model: str = "small"
    default_language: str = "it"
    default_device: str = "auto"
    default_compute_type: str = "auto"
    default_beam_size: int = 2
    output_dir: Path = APP_DATA_DIR / "transcriptions"
    
    class Config:
        env_prefix = "V2K_"

settings = Settings()
settings.output_dir.mkdir(parents=True, exist_ok=True)
