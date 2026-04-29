import time
from typing import List

from eth_account.signers.local import LocalAccount
from web3 import Web3

from config import load_config


LENDING_POOL_ABI = [
	{
		"anonymous": False,
		"inputs": [
			{"indexed": True, "internalType": "address", "name": "borrower", "type": "address"},
			{"indexed": True, "internalType": "uint256", "name": "loanId", "type": "uint256"},
			{"indexed": False, "internalType": "uint256", "name": "loanAmount", "type": "uint256"},
			{"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
		],
		"name": "BorrowerDefaulted",
		"type": "event",
	}
]

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
					{
						"internalType": "enum ICDSVault.PositionState",
						"name": "state",
						"type": "uint8",
					},
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

SETTLEMENT_ENGINE_ABI = [
	{
		"inputs": [{"internalType": "uint256[]", "name": "positionIds", "type": "uint256[]"}],
		"name": "batchSettleCDS",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function",
	}
]


def _find_impacted_positions(cds_vault, borrower: str) -> List[int]:
	total_positions = cds_vault.functions.getTotalPositions().call()
	borrower_checksum = Web3.to_checksum_address(borrower)
	impacted: List[int] = []

	for position_id in range(1, total_positions + 1):
		if not cds_vault.functions.isActive(position_id).call():
			continue

		pos = cds_vault.functions.getPosition(position_id).call()
		reference_entity = Web3.to_checksum_address(pos[2])
		if reference_entity == borrower_checksum:
			impacted.append(position_id)

	return impacted


def _send_settlement_tx(w3: Web3, account: LocalAccount, settlement_engine, position_ids: List[int]) -> str:
	tx = settlement_engine.functions.batchSettleCDS(position_ids).build_transaction(
		{
			"from": account.address,
			"nonce": w3.eth.get_transaction_count(account.address),
			"gasPrice": w3.eth.gas_price,
		}
	)

	try:
		gas_limit = w3.eth.estimate_gas(tx)
	except Exception:
		gas_limit = 1_500_000
	tx["gas"] = gas_limit

	signed = account.sign_transaction(tx)
	tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
	return tx_hash.hex()


def main() -> None:
	cfg = load_config()
	w3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
	if not w3.is_connected():
		raise RuntimeError("Failed to connect to RPC provider")

	account: LocalAccount = w3.eth.account.from_key(cfg.private_key)
	lending_pool = w3.eth.contract(
		address=Web3.to_checksum_address(cfg.lending_pool_address), abi=LENDING_POOL_ABI
	)
	cds_vault = w3.eth.contract(address=Web3.to_checksum_address(cfg.cds_vault_address), abi=CDS_VAULT_ABI)
	settlement_engine = w3.eth.contract(
		address=Web3.to_checksum_address(cfg.settlement_engine_address), abi=SETTLEMENT_ENGINE_ABI
	)

	start_block = max(0, w3.eth.block_number - 100)
	print(f"Keeper started at block {start_block} as {account.address}")

	while True:
		latest = w3.eth.block_number
		to_block = max(start_block, latest - cfg.confirmations)

		if to_block >= start_block:
			events = lending_pool.events.BorrowerDefaulted().get_logs(
				from_block=start_block,
				to_block=to_block,
			)

			for event in events:
				borrower = event["args"]["borrower"]
				loan_id = int(event["args"]["loanId"])
				position_ids = _find_impacted_positions(cds_vault, borrower)

				if not position_ids:
					print(f"No CDS positions for borrower {borrower} (loanId={loan_id})")
					continue

				tx_hash = _send_settlement_tx(w3, account, settlement_engine, position_ids)
				print(
					f"Settling borrower {borrower} loanId={loan_id} positions={position_ids} tx={tx_hash}"
				)

			start_block = to_block + 1

		time.sleep(cfg.poll_interval_secs)


if __name__ == "__main__":
	main()
