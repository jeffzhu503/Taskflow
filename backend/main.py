from telemetry import setup_telemetry

setup_telemetry()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from routers import repo, issues, pulls, labels

app = FastAPI(title="TaskFlow GitHub Bridge", version="1.0.0")

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
HTTPXClientInstrumentor().instrument()


@app.get("/")
async def root() -> dict:
    return {"status": "ok", "docs": "/docs"}
