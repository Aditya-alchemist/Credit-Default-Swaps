from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from api.routes import health, spread, greeks

load_dotenv()

app = FastAPI(title="CDS Protocol API", version="0.1.0")

def _cors_origins() -> list[str]:
    raw_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(spread.router)
app.include_router(greeks.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "cds-protocol-api", "version": "0.1.0"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """Basic health check endpoint"""
    return {"status": "healthy", "backend": "healthy"}
