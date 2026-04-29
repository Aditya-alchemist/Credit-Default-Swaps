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
	poll_interval_secs: int
	confirmations: int


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
		poll_interval_secs=int(os.getenv("POLL_INTERVAL_SECS", "6")),
		confirmations=int(os.getenv("CONFIRMATIONS", "1")),
	)
