from typing import Dict, List, Set

from web3 import Web3


def get_active_position_ids(cds_vault) -> List[int]:
	total_positions = int(cds_vault.functions.getTotalPositions().call())
	active: List[int] = []

	for position_id in range(1, total_positions + 1):
		if cds_vault.functions.isActive(position_id).call():
			active.append(position_id)

	return active


def build_entity_position_index(cds_vault) -> Dict[str, List[int]]:
	index: Dict[str, List[int]] = {}

	for position_id in get_active_position_ids(cds_vault):
		pos = cds_vault.functions.getPosition(position_id).call()
		entity = Web3.to_checksum_address(pos[2])
		index.setdefault(entity, []).append(position_id)

	return index


def get_active_entities(cds_vault) -> Set[str]:
	return set(build_entity_position_index(cds_vault).keys())


def get_reference_entities(cds_vault) -> Set[str]:
	total_positions = int(cds_vault.functions.getTotalPositions().call())
	entities: Set[str] = set()

	for position_id in range(1, total_positions + 1):
		try:
			pos = cds_vault.functions.getPosition(position_id).call()
			entity = Web3.to_checksum_address(pos[2])
			if int(entity, 16) != 0:
				entities.add(entity)
		except Exception as exc:
			print(f"[get_reference_entities] skipped position={position_id} error={exc}")

	return entities
