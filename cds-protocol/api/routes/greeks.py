from fastapi import APIRouter, HTTPException
from typing import Dict

router = APIRouter(prefix="/greeks", tags=["greeks"])


@router.get("/{position_id}")
async def get_position_greeks(position_id: int) -> Dict:
    """
    Get greek exposures for a CDS position
    Returns delta, gamma, vega, theta, rho exposures
    """
    if position_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid position ID")
    
    return {
        "position_id": position_id,
        "delta": 0.65,  # Change in value per 1% move in spread
        "gamma": 0.12,  # Change in delta per 1% move in spread
        "vega": 0.45,   # Change in value per 1% change in volatility
        "theta": -0.08,  # Time decay per day
        "rho": 0.25,    # Change in value per 1% change in rates
        "spread_duration": 4.5,  # Effective duration to spread changes
        "risk_level": "moderate",
        "last_calculated": "2026-05-03T12:00:00Z"
    }
