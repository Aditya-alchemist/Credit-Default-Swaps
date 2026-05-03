import time
from typing import Dict, List

from eth_account.signers.local import LocalAccount
from web3 import Web3

from bot.config import load_config
from bot.event_detector import build_entity_position_index, get_active_position_ids, get_reference_entities
from bot.margin_checker import job_check_margins, job_liquidate_expired_calls
from bot.oracle_updater import job_push_credit_scores


CDS_VAULT_ABI = [
	{
		"inputs": [],
		"name": "getTotalPositions",
		"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [{"internalType": "uint256", "name": "positionId", "type": "uint256"}],
		"name": "getPosition",
		"outputs": [
			{
				"components": [
					{"internalType": "address", "name": "buyer", "type": "address"},
					{"internalType": "address", "name": "seller", "type": "address"},
					{"internalType": "address", "name": "referenceEntity", "type": "address"},
					{"internalType": "uint256", "name": "notional", "type": "uint256"},
					{"internalType": "uint256", "name": "spreadBps", "type": "uint256"},
					{"internalType": "uint256", "name": "collateral", "type": "uint256"},
					{"internalType": "uint256", "name": "maturity", "type": "uint256"},
					{"internalType": "uint256", "name": "openTimestamp", "type": "uint256"},
					{"internalType": "uint256", "name": "lastPremiumPaid", "type": "uint256"},
					{"internalType": "uint8", "name": "state", "type": "uint8"},
				],
				"internalType": "struct ICDSVault.CDSPosition",
				"name": "",
				"type": "tuple",
			}
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [{"internalType": "uint256", "name": "positionId", "type": "uint256"}],
		"name": "isActive",
		"outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
		"stateMutability": "view",
		"type": "function",
	},
]

CREDIT_ORACLE_ABI = [
	{
		"inputs": [{"internalType": "address", "name": "", "type": "address"}],
		"name": "creditByEntity",
		"outputs": [
			{"internalType": "uint256", "name": "score", "type": "uint256"},
			{"internalType": "uint256", "name": "spreadBps", "type": "uint256"},
			{"internalType": "uint256", "name": "lambdaBps", "type": "uint256"},
			{"internalType": "uint256", "name": "recoveryBps", "type": "uint256"},
			{"internalType": "bool", "name": "defaulted_", "type": "bool"},
			{"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
		],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [{"internalType": "address", "name": "entity", "type": "address"}],
		"name": "isStale",
		"outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [
			{"internalType": "address", "name": "entity", "type": "address"},
			{"internalType": "uint256", "name": "score", "type": "uint256"},
			{"internalType": "uint256", "name": "lambdaBps", "type": "uint256"},
			{"internalType": "uint256", "name": "recoveryBps", "type": "uint256"},
		],
		"name": "setCreditData",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [{"internalType": "address", "name": "entity", "type": "address"}],
		"name": "isCreditEventDeclared",
		"outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
		"stateMutability": "view",
		"type": "function",
	},
]

MARGIN_ENGINE_ABI = [
	{
		"inputs": [{"internalType": "uint256", "name": "positionId", "type": "uint256"}],
		"name": "checkAndFlag",
		"outputs": [{"internalType": "bool", "name": "flagged", "type": "bool"}],
		"stateMutability": "nonpayable",
		"type": "function",
	},
	{
		"inputs": [{"internalType": "uint256", "name": "positionId", "type": "uint256"}],
		"name": "getMarginCallDeadline",
		"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
		"stateMutability": "view",
		"type": "function",
	},
	{
		"inputs": [{"internalType": "uint256", "name": "positionId", "type": "uint256"}],
		"name": "liquidatePosition",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	},
]

PREMIUM_ENGINE_ABI = [
	{
		"inputs": [{"internalType": "uint256", "name": "positionId", "type": "uint256"}],
		"name": "isPremiumMissed",
		"outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
		"stateMutability": "view",
		"type": "function",
	}
]

SETTLEMENT_ENGINE_ABI = [
	{
		"inputs": [{"internalType": "uint256[]", "name": "positionIds", "type": "uint256[]"}],
		"name": "batchSettleCDS",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	}
]


def _build_tx_sender(w3: Web3, account: LocalAccount):
	def _send(contract_function) -> str:
		tx = contract_function.build_transaction(
			{
				"from": account.address,
				"nonce": w3.eth.get_transaction_count(account.address, "pending"),
				"gasPrice": w3.eth.gas_price,
			}
		)
		try:
			tx["gas"] = w3.eth.estimate_gas(tx)
		except Exception:
			tx["gas"] = 1_500_000

		signed = account.sign_transaction(tx)
		tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
		return tx_hash.hex()

	return _send


def job_check_missed_premiums(active_position_ids: List[int], premium_engine) -> None:
	for position_id in active_position_ids:
		try:
			if premium_engine.functions.isPremiumMissed(position_id).call():
				print(f"[job_check_missed_premiums] WARNING missed premium for position={position_id}")
		except Exception as exc:
			print(f"[job_check_missed_premiums] failed position={position_id} error={exc}")


def job_settle_defaults(entity_position_index: Dict[str, List[int]], credit_oracle, settlement_engine, tx_sender, chunk_size: int) -> None:
	for entity, position_ids in entity_position_index.items():
		try:
			if not credit_oracle.functions.isCreditEventDeclared(entity).call():
				continue

			for i in range(0, len(position_ids), chunk_size):
				chunk = position_ids[i:i + chunk_size]
				tx_hash = tx_sender(settlement_engine.functions.batchSettleCDS(chunk))
				print(f"[job_settle_defaults] entity={entity} positions={chunk} tx={tx_hash}")
		except Exception as exc:
			print(f"[job_settle_defaults] failed entity={entity} error={exc}")


def run_keeper_forever() -> None:
	cfg = load_config()
	w3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
	if not w3.is_connected():
		raise RuntimeError("Failed to connect to RPC provider")

	account: LocalAccount = w3.eth.account.from_key(cfg.private_key)
	tx_sender = _build_tx_sender(w3, account)

	cds_vault = w3.eth.contract(address=Web3.to_checksum_address(cfg.cds_vault_address), abi=CDS_VAULT_ABI)
	credit_oracle = w3.eth.contract(
		address=Web3.to_checksum_address(cfg.credit_oracle_address), abi=CREDIT_ORACLE_ABI
	)
	margin_engine = w3.eth.contract(
		address=Web3.to_checksum_address(cfg.margin_engine_address), abi=MARGIN_ENGINE_ABI
	)
	premium_engine = w3.eth.contract(
		address=Web3.to_checksum_address(cfg.premium_engine_address), abi=PREMIUM_ENGINE_ABI
	)
	settlement_engine = w3.eth.contract(
		address=Web3.to_checksum_address(cfg.settlement_engine_address), abi=SETTLEMENT_ENGINE_ABI
	)

	print(
		"Keeper started "
		f"account={account.address} interval={cfg.poll_interval_secs}s chunk={cfg.settlement_chunk_size}"
	)

	while True:
		start_ts = int(time.time())
		print(f"\n=== Keeper cycle @ {start_ts} ===")

		active_position_ids = get_active_position_ids(cds_vault)
		entity_position_index = build_entity_position_index(cds_vault)
		entities = get_reference_entities(cds_vault)

		# Job 1: Push credit scores for referenced entities.
		job_push_credit_scores(entities, credit_oracle, tx_sender, cfg)

		# Job 2: Check all active margins.
		job_check_margins(active_position_ids, margin_engine, tx_sender)

		# Job 3: Liquidate expired margin calls.
		job_liquidate_expired_calls(active_position_ids, margin_engine, tx_sender, start_ts)

		# Job 4: Check missed premiums and warn.
		job_check_missed_premiums(active_position_ids, premium_engine)

		# Job 5: Settle defaulted entities in chunks.
		job_settle_defaults(
			entity_position_index,
			credit_oracle,
			settlement_engine,
			tx_sender,
			cfg.settlement_chunk_size,
		)

		time.sleep(cfg.poll_interval_secs)


if __name__ == "__main__":
	run_keeper_forever()
