import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass
class BotConfig:
	rpc_url: str
	private_key: str
	lending_pool_address: str
	cds_vault_address: str
	settlement_engine_address: str
	credit_oracle_address: str
	margin_engine_address: str
	premium_engine_address: str
	poll_interval_secs: int
	confirmations: int
	settlement_chunk_size: int
	risk_api_url: str
	risk_api_key: str
	risk_api_timeout_secs: int


def _require_env(name: str) -> str:
	value = os.getenv(name, "").strip()
	if not value:
		raise ValueError(f"Missing required environment variable: {name}")
	return value


def load_config() -> BotConfig:
	load_dotenv()

	return BotConfig(
		rpc_url=_require_env("RPC_URL"),
		private_key=_require_env("KEEPER_PRIVATE_KEY"),
		lending_pool_address=_require_env("LENDING_POOL_ADDRESS"),
		cds_vault_address=_require_env("CDS_VAULT_ADDRESS"),
		settlement_engine_address=_require_env("SETTLEMENT_ENGINE_ADDRESS"),
		credit_oracle_address=_require_env("CREDIT_ORACLE_ADDRESS"),
		margin_engine_address=_require_env("MARGIN_ENGINE_ADDRESS"),
		premium_engine_address=_require_env("PREMIUM_ENGINE_ADDRESS"),
		poll_interval_secs=int(os.getenv("POLL_INTERVAL_SECS", "1800")),
		confirmations=int(os.getenv("CONFIRMATIONS", "1")),
		settlement_chunk_size=int(os.getenv("SETTLEMENT_CHUNK_SIZE", "10")),
		risk_api_url=os.getenv("RISK_API_URL", "").strip(),
		risk_api_key=os.getenv("RISK_API_KEY", "").strip(),
		risk_api_timeout_secs=int(os.getenv("RISK_API_TIMEOUT_SECS", "15")),
	)
