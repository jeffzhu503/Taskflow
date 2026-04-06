from pathlib import Path
from pydantic_settings import BaseSettings

ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    github_pat: str
    openai_api_key: str
    anthropic_api_key: str
    llm_model: str = "claude-sonnet-4-6"
    rag_db_path: str = str(Path.home() / ".taskflow" / "rag-db")

    # OpenTelemetry
    otel_enabled: bool = True
    otel_endpoint: str = "http://localhost:4318"
    otel_service_name: str = "taskflow-backend"

    model_config = {"env_file": str(ENV_FILE)}


settings = Settings()
