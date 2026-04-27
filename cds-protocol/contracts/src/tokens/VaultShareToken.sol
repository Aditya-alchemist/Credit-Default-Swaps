// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract VaultShareToken is ERC20, Ownable {
	address public vault;

	error NotVault();
	error ZeroAddress();

	event VaultSet(address indexed vault);

	constructor(string memory name_, string memory symbol_, address owner_)
		ERC20(name_, symbol_)
		Ownable(owner_)
	{}

	modifier onlyVault() {
		_onlyVault();
		_;
	}

	function _onlyVault() internal view {
		if (msg.sender != vault) revert NotVault();
	}

	function decimals() public pure override returns (uint8) {
		return 6;
	}

	function setVault(address _vault) external onlyOwner {
		if (_vault == address(0)) revert ZeroAddress();
		vault = _vault;
		emit VaultSet(_vault);
	}

	function mint(address to, uint256 amount) external onlyVault {
		_mint(to, amount);
	}

	function burn(address from, uint256 amount) external onlyVault {
		_burn(from, amount);
	}
}

