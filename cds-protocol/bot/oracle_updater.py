from typing import Iterable

from bot.config import BotConfig
from bot.credit_model import compute_credit_data


def job_push_credit_scores(entities: Iterable[str], credit_oracle, tx_sender, cfg: BotConfig) -> None:
	for entity in entities:
		try:
			if not credit_oracle.functions.isStale(entity).call():
				continue

			credit = compute_credit_data(entity, cfg)
			tx_hash = tx_sender(
				credit_oracle.functions.setCreditData(
					entity,
					int(credit["score"]),
					int(credit["lambda_bps"]),
					int(credit["recovery_bps"]),
				)
			)
			print(
				"[job_push_credit_scores] "
				f"entity={entity} score={credit['score']} lambda={credit['lambda_bps']} "
				f"recovery={credit['recovery_bps']} spread={credit['spread_bps']} tx={tx_hash}"
			)
		except Exception as exc:
			print(f"[job_push_credit_scores] failed entity={entity} error={exc}")
