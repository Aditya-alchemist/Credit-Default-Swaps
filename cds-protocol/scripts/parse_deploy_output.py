#!/usr/bin/env python3
"""
Parse the stdout from `forge script ...` (the Deploy.s.sol script) and write a JSON file
with all deployed addresses.

Usage:
  python scripts/parse_deploy_output.py path/to/deploy_output.txt path/to/addresses.json

If no arguments are provided, defaults are used:
  cds-protocol/deploy/deploy_output.txt -> cds-protocol/deploy/addresses.json
"""
import sys
import re
import json
from pathlib import Path

DEFAULT_IN = Path(__file__).resolve().parent.parent / "deploy" / "deploy_output.txt"
DEFAULT_OUT = Path(__file__).resolve().parent.parent / "deploy" / "addresses.json"

LABELS = [
    "USDC",
    "WETH",
    "CDSToken",
    "VaultShareToken",
    "LendingToken",
    "CreditOracle",
    "ChainlinkAdapter",
    "CommitteeOracle",
    "CDSVault",
    "PremiumEngine",
    "MarginEngine",
    "SettlementEngine",
    "LendingPool",
]

def parse_lines(lines):
    addresses = {}
    # regex: label: 0x...
    rx = re.compile(r"^\s*([A-Za-z0-9_]+):\s*(0x[0-9a-fA-F]{40})\b")
    for line in lines:
        m = rx.match(line)
        if not m:
            continue
        label = m.group(1).strip()
        addr = m.group(2).strip()
        # normalize known labels
        if label in LABELS:
            addresses[label] = addr
        else:
            # also accept lowercase or alternative labels
            up = label.capitalize()
            if up in LABELS:
                addresses[up] = addr
            else:
                addresses[label] = addr
    return addresses


def main():
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT

    if not in_path.exists():
        print(f"Input file not found: {in_path}")
        sys.exit(2)

    out_path.parent.mkdir(parents=True, exist_ok=True)

    with in_path.open() as f:
        lines = f.readlines()

    addresses = parse_lines(lines)

    if not addresses:
        print("No addresses parsed from file. Is the deploy output correct?")
        sys.exit(3)

    with out_path.open("w") as f:
        json.dump(addresses, f, indent=2)

    print(f"Wrote {len(addresses)} addresses to {out_path}")

if __name__ == '__main__':
    main()
