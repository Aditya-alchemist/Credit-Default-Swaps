import hashlib
from typing import Dict

import requests

from bot.config import BotConfig
from bot.hazard_mapper import spread_from_lambda_and_recovery


def _mock_credit_data(entity_addr: str) -> Dict[str, int]:
	seed = int(hashlib.sha256(entity_addr.lower().encode("utf-8")).hexdigest()[:8], 16)

	# Deterministic pseudo-random ranges for local/dev usage.
	score = 500 + (seed % 301)          # 500..800
	lambda_bps = 80 + (seed % 421)      # 80..500
	recovery_bps = 3000 + (seed % 2501) # 3000..5500
	spread_bps = spread_from_lambda_and_recovery(lambda_bps, recovery_bps)

	return {
		"score": int(score),
		"lambda_bps": int(lambda_bps),
		"recovery_bps": int(recovery_bps),
		"spread_bps": int(spread_bps),
	}


def _api_credit_data(entity_addr: str, cfg: BotConfig) -> Dict[str, int]:
	if not cfg.risk_api_url:
		raise ValueError("RISK_API_URL missing")

	headers = {}
	if cfg.risk_api_key:
		headers["Authorization"] = f"Bearer {cfg.risk_api_key}"

	url = cfg.risk_api_url.rstrip("/") + f"/score/{entity_addr}"
	response = requests.get(url, headers=headers, timeout=cfg.risk_api_timeout_secs)
	response.raise_for_status()
	data = response.json()

	lambda_bps = int(data["lambda_bps"])
	recovery_bps = int(data["recovery_bps"])
	score = int(data["score"])
	spread_bps = spread_from_lambda_and_recovery(lambda_bps, recovery_bps)

	return {
		"score": score,
		"lambda_bps": lambda_bps,
		"recovery_bps": recovery_bps,
		"spread_bps": spread_bps,
	}


def compute_credit_data(entity_addr: str, cfg: BotConfig) -> Dict[str, int]:
	"""
	Returns keys: score, lambda_bps, recovery_bps, spread_bps.
	Uses risk API when configured; otherwise deterministic mock model.
	"""
	if cfg.risk_api_url:
		try:
			return _api_credit_data(entity_addr, cfg)
		except Exception:
			# Fallback to mock if API temporarily fails.
			return _mock_credit_data(entity_addr)

	return _mock_credit_data(entity_addr)
