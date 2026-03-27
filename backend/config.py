from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    github_pat: str

    # OpenTelemetry
    otel_enabled: bool = True
    otel_endpoint: str = "http://localhost:4318"
    otel_service_name: str = "taskflow-backend"

    model_config = {"env_file": str(ENV_FILE)}


settings = Settings()
