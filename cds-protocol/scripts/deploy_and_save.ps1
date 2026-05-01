# PowerShell helper to run the Foundry deploy script and save output
# Requires: Forge installed and in PATH. Set these env vars first:
#  $env:RPC_URL , $env:PRIVATE_KEY
# Optionally: $env:KEEPER_ADDRESS, CHAINLINK_WETH_USD

$deployDir = Join-Path $PSScriptRoot "..\deploy"
if (-not (Test-Path $deployDir)) { New-Item -ItemType Directory -Path $deployDir | Out-Null }

$outFile = Join-Path $deployDir "deploy_output.txt"
$addressesFile = Join-Path $deployDir "addresses.json"

if (-not $env:RPC_URL) { Write-Error "Please set RPC_URL environment variable to Sepolia RPC endpoint."; exit 1 }
if (-not $env:PRIVATE_KEY) { Write-Error "Please set PRIVATE_KEY environment variable with the deployer's private key."; exit 1 }

# Run forge script and capture stdout
$cmd = "forge script script/Deploy.s.sol:Deploy --rpc-url $env:RPC_URL --private-key $env:PRIVATE_KEY --broadcast -vvvv"
Write-Host "Running: $cmd"
# Execute and capture all output
& bash -lc "$cmd" 2>&1 | Tee-Object -FilePath $outFile

if ($LASTEXITCODE -ne 0) { Write-Error "Forge script failed. See $outFile"; exit $LASTEXITCODE }

# Parse output into JSON using the parser
python3 "$(Join-Path $PSScriptRoot 'parse_deploy_output.py')" $outFile $addressesFile

if ($LASTEXITCODE -ne 0) { Write-Error "Parsing failed"; exit $LASTEXITCODE }

Write-Host "Deployment complete. Addresses saved to $addressesFile"
