from fastapi import APIRouter, HTTPException
from typing import Dict

router = APIRouter(prefix="/quote", tags=["quotes"])


@router.get("")
async def get_cds_quote(
    entity: str,
    notional: int = 100_000_000,
    tenor: int = 365
) -> Dict:
    """
    Get CDS quote for an entity
    Returns spread, premium rate, and estimated cost
    """
    if not entity or entity == "0x0":
        raise HTTPException(status_code=400, detail="Invalid entity address")
    
    if notional <= 0:
        raise HTTPException(status_code=400, detail="Notional must be positive")
    
    if tenor <= 0 or tenor > 3650:
        raise HTTPException(status_code=400, detail="Tenor must be between 1 and 3650 days")
    
    # Mock CDS pricing model
    base_spread = 150  # basis points
    tenor_adjustment = 1.0 + (tenor - 365) / 3650  # adjust for tenor
    spread_bps = int(base_spread * tenor_adjustment)
    
    return {
        "entity": entity,
        "notional": notional,
        "tenor_days": tenor,
        "spread_bps": spread_bps,
        "premium_rate": spread_bps / 10_000,
        "estimated_annual_cost": (notional * spread_bps) / 10_000,
        "currency": "USDC",
        "quote_timestamp": "2026-05-03T12:00:00Z"
    }
