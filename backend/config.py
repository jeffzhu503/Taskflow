from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    github_pat: str

    model_config = {"env_file": str(ENV_FILE)}


settings = Settings()
