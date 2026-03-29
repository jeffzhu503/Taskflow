import asyncio
import logging
from contextlib import asynccontextmanager

from telemetry import setup_telemetry

setup_telemetry()

# Instrument httpx before routers are imported so module-level AsyncClient
# instances in graphql_client.py and rest_client.py are patched at creation time.
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
HTTPXClientInstrumentor().instrument()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from routers import repo, issues, pulls, labels
from github import graphql_client, rest_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("TaskFlow backend started")
    yield
    await asyncio.gather(graphql_client.close(), rest_client.close())


app = FastAPI(title="TaskFlow GitHub Bridge", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(repo.router, prefix="/api")
app.include_router(issues.router, prefix="/api")
app.include_router(pulls.router, prefix="/api")
app.include_router(labels.router, prefix="/api")

FastAPIInstrumentor.instrument_app(app)


@app.get("/")
async def root() -> dict:
    return {"status": "ok", "docs": "/docs"}
