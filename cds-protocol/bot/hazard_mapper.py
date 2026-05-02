def spread_from_lambda_and_recovery(lambda_bps: int, recovery_bps: int) -> int:
	"""
	Approximate fair spread in bps using: spread = lambda / (1 - recovery).

	lambda_bps and recovery_bps are both in basis points.
	"""
	if lambda_bps < 0:
		raise ValueError("lambda_bps must be non-negative")
	if recovery_bps < 0 or recovery_bps > 10_000:
		raise ValueError("recovery_bps must be within [0, 10000]")

	denominator_bps = 10_000 - recovery_bps
	if denominator_bps == 0:
		# At 100% recovery, fair spread collapses toward zero.
		return 0

	# Keep result in bps.
	return int((lambda_bps * 10_000) / denominator_bps)
