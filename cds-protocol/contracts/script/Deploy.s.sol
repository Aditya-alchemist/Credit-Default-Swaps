// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2 as console} from "forge-std/Script.sol";

import {MockERC20} from "../mocks/MockERC20.sol";
import {CDSToken} from "../src/tokens/CDSToken.sol";
import {VaultShareToken} from "../src/tokens/VaultShareToken.sol";
import {LendingToken} from "../src/tokens/LendingToken.sol";
import {CDSVault} from "../src/core/CDSVault.sol";
import {PremiumEngine} from "../src/core/PremiumEngine.sol";
import {MarginEngine} from "../src/core/MarginEngine.sol";
import {SettlementEngine} from "../src/core/SettlementEngine.sol";
import {LendingPool} from "../src/core/LendingPool.sol";
import {CreditOracle} from "../src/oracle/CreditOracle.sol";
import {ChainlinkAdapter} from "../src/oracle/ChainlinkAdapter.sol";
import {CommitteeOracle} from "../src/oracle/CommitteeOracle.sol";

contract Deploy is Script {
    struct Deployment {
        address usdc;
        address weth;
        address cdsToken;
        address vaultShareToken;
        address lendingToken;
        address creditOracle;
        address chainlinkAdapter;
        address committeeOracle;
        address cdsVault;
        address premiumEngine;
        address marginEngine;
        address settlementEngine;
        address lendingPool;
    }

    Deployment public deployment;

    function _loadCommittee(address deployer, address keeper) internal view returns (address[] memory committee) {
        committee = new address[](5);
        committee[0] = vm.envOr("COMMITTEE_1", deployer);
        committee[1] = vm.envOr("COMMITTEE_2", keeper);
        committee[2] = vm.envOr("COMMITTEE_3", deployer);
        committee[3] = vm.envOr("COMMITTEE_4", keeper);
        committee[4] = vm.envOr("COMMITTEE_5", deployer);
    }

    function run() external virtual {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address keeper = vm.envOr("KEEPER_ADDRESS", deployer);
        address[] memory committee = _loadCommittee(deployer, keeper);

        vm.startBroadcast(deployerKey);

        console.log("=== Step 1: Mock assets ===");
        deployment.usdc = address(new MockERC20("Mock USDC", "USDC", 6));
        deployment.weth = address(new MockERC20("Mock WETH", "WETH", 18));
        console.log("USDC:", deployment.usdc);
        console.log("WETH:", deployment.weth);

        console.log("=== Step 2: Tokens ===");
        deployment.cdsToken = address(new CDSToken("", deployer));
        deployment.vaultShareToken = address(new VaultShareToken("Vault Share USDC", "pvUSDC", deployer));
        deployment.lendingToken = address(new LendingToken("Lending USDC", "lUSDC", deployer));
        console.log("CDSToken:", deployment.cdsToken);
        console.log("VaultShareToken:", deployment.vaultShareToken);
        console.log("LendingToken:", deployment.lendingToken);

        console.log("=== Step 3: Oracles ===");
        deployment.creditOracle = address(new CreditOracle(deployer));
        deployment.chainlinkAdapter = address(new ChainlinkAdapter(deployer));
        deployment.committeeOracle = address(new CommitteeOracle(committee, 3, deployer));
        console.log("CreditOracle:", deployment.creditOracle);
        console.log("ChainlinkAdapter:", deployment.chainlinkAdapter);
        console.log("CommitteeOracle:", deployment.committeeOracle);

        console.log("=== Step 4: Vault ===");
        deployment.cdsVault = address(new CDSVault(deployment.usdc, deployment.cdsToken, deployer));
        console.log("CDSVault:", deployment.cdsVault);
        CDSToken(deployment.cdsToken).setMinter(deployment.cdsVault, true);
        console.log("CDSToken minter set");

        console.log("=== Step 5: Engines ===");
        deployment.premiumEngine = address(new PremiumEngine(deployment.usdc, deployment.cdsVault, deployment.cdsVault, deployer));
        deployment.marginEngine = address(new MarginEngine(deployment.cdsVault, deployment.creditOracle, deployer));
        deployment.settlementEngine = address(new SettlementEngine(deployment.cdsVault, deployment.creditOracle, deployer));
        console.log("PremiumEngine:", deployment.premiumEngine);
        console.log("MarginEngine:", deployment.marginEngine);
        console.log("SettlementEngine:", deployment.settlementEngine);

        console.log("=== Step 6: Wire vault ===");
        CDSVault(deployment.cdsVault).setEngines(deployment.settlementEngine, deployment.marginEngine, deployment.premiumEngine);
        console.log("Vault engines wired");

        console.log("=== Step 7: Lending pool ===");
        deployment.lendingPool = address(new LendingPool(
            deployment.usdc,
            deployment.weth,
            deployment.lendingToken,
            deployment.cdsVault,
            deployment.premiumEngine,
            deployment.marginEngine,
            deployment.creditOracle,
            deployer
        ));
        console.log("LendingPool:", deployment.lendingPool);
        LendingToken(deployment.lendingToken).setPool(deployment.lendingPool);
        console.log("LendingToken pool set");

        console.log("=== Step 8: Token permissions ===");
        VaultShareToken(deployment.vaultShareToken).setVault(deployment.cdsVault);
        CreditOracle(deployment.creditOracle).setUpdater(keeper, true);
        CreditOracle(deployment.creditOracle).setAuthorizedReporter(deployment.lendingPool, true);
        console.log("VaultShareToken vault set");
        console.log("CreditOracle keeper authorized");
        console.log("CreditOracle lending pool reporter authorized");

        address wethUsdFeed = vm.envOr("CHAINLINK_WETH_USD", address(0));
        if (wethUsdFeed != address(0)) {
            ChainlinkAdapter(deployment.chainlinkAdapter).setFeed(deployment.weth, wethUsdFeed);
            console.log("Chainlink feed set for WETH");
        }

        console.log("=== Step 9: Mint test balances ===");
        MockERC20(deployment.usdc).mint(deployer, 1_000_000 * 1e6);
        MockERC20(deployment.weth).mint(deployer, 1_000 * 1e18);
        console.log("Minted mock balances to deployer");

        vm.stopBroadcast();

        console.log("=== Deployment Summary ===");
        console.log("USDC:", deployment.usdc);
        console.log("WETH:", deployment.weth);
        console.log("CDSToken:", deployment.cdsToken);
        console.log("VaultShareToken:", deployment.vaultShareToken);
        console.log("LendingToken:", deployment.lendingToken);
        console.log("CreditOracle:", deployment.creditOracle);
        console.log("ChainlinkAdapter:", deployment.chainlinkAdapter);
        console.log("CommitteeOracle:", deployment.committeeOracle);
        console.log("CDSVault:", deployment.cdsVault);
        console.log("PremiumEngine:", deployment.premiumEngine);
        console.log("MarginEngine:", deployment.marginEngine);
        console.log("SettlementEngine:", deployment.settlementEngine);
        console.log("LendingPool:", deployment.lendingPool);
    }
}
