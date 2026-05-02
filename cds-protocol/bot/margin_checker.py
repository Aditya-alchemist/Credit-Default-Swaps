from typing import List


def job_check_margins(active_position_ids: List[int], margin_engine, tx_sender) -> None:
	for position_id in active_position_ids:
		try:
			tx_hash = tx_sender(margin_engine.functions.checkAndFlag(position_id))
			print(f"[job_check_margins] checked position={position_id} tx={tx_hash}")
		except Exception as exc:
			print(f"[job_check_margins] failed position={position_id} error={exc}")


def job_liquidate_expired_calls(active_position_ids: List[int], margin_engine, tx_sender, now_ts: int) -> None:
	for position_id in active_position_ids:
		try:
			deadline = int(margin_engine.functions.getMarginCallDeadline(position_id).call())
			if deadline == 0:
				continue
			if now_ts <= deadline:
				continue

			tx_hash = tx_sender(margin_engine.functions.liquidatePosition(position_id))
			print(
				f"[job_liquidate_expired_calls] liquidated position={position_id} "
				f"deadline={deadline} tx={tx_hash}"
			)
		except Exception as exc:
			print(f"[job_liquidate_expired_calls] failed position={position_id} error={exc}")
