// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LendingToken is ERC20, Ownable {
	address public pool;

	error NotPool();
	error ZeroAddress();

	event PoolSet(address indexed pool);

	constructor(string memory name_, string memory symbol_, address owner_)
		ERC20(name_, symbol_)
		Ownable(owner_)
	{}

	modifier onlyPool() {
		_onlyPool();
		_;
	}

	function _onlyPool() internal view {
		if (msg.sender != pool) revert NotPool();
	}

	function decimals() public pure override returns (uint8) {
		return 6;
	}

	function setPool(address _pool) external onlyOwner {
		if (_pool == address(0)) revert ZeroAddress();
		pool = _pool;
		emit PoolSet(_pool);
	}

	function mint(address to, uint256 amount) external onlyPool {
		_mint(to, amount);
	}

	function burn(address from, uint256 amount) external onlyPool {
		_burn(from, amount);
	}
}

