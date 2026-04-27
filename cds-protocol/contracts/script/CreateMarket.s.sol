// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2 as console} from "forge-std/Script.sol";
import {CreditOracle} from "../src/oracle/CreditOracle.sol";

contract CreateMarket is Script {
    function run() external {
        uint256 keeperKey = vm.envUint("PRIVATE_KEY");
        address oracleAddr = vm.envAddress("CREDIT_ORACLE_ADDRESS");
        address entity = vm.envOr("MARKET_ENTITY_ADDRESS", address(0x1234567890123456789012345678901234567890));

        vm.startBroadcast(keeperKey);

        CreditOracle oracle = CreditOracle(oracleAddr);
        oracle.setCreditData(entity, 8200, 119, 4000);

        console.log("Added market entity:", entity);
        console.log("Credit score: 8200");
        console.log("Spread bps: 119");
        console.log("Recovery bps: 4000");

        vm.stopBroadcast();
    }
}
