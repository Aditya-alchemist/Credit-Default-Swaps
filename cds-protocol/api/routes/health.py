from fastapi import APIRouter, HTTPException
from typing import Dict
from datetime import datetime, timezone

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/{entity}")
async def get_entity_health(entity: str) -> Dict:
    """
    Get health status for an entity
    Returns credit score, spread, default probability
    """
    if not entity or entity == "0x0":
        raise HTTPException(status_code=400, detail="Invalid entity address")
    
    return {
        "entity": entity,
        "score": 750,
        "spread_bps": 150,
        "lambda_bps": 200,
        "recovery_bps": 4000,
        "default_probability": 2.0,
        "status": "healthy",
        "last_updated": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }
