// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CDSToken is ERC1155, Ownable {
	struct PositionHolders {
		address buyer;
		address seller;
	}

	mapping(address => bool) public minters;
	mapping(uint256 => PositionHolders) public holders;

	event MinterSet(address indexed account, bool allowed);

	error NotMinter();
	error ZeroAddress();

	constructor(string memory uri_, address owner_) ERC1155(uri_) Ownable(owner_) {}

	modifier onlyMinter() {
		_onlyMinter();
		_;
	}

	function _onlyMinter() internal view {
		if (!minters[msg.sender]) revert NotMinter();
	}

	function setMinter(address account, bool allowed) external onlyOwner {
		if (account == address(0)) revert ZeroAddress();
		minters[account] = allowed;
		emit MinterSet(account, allowed);
	}

	function buyerTokenId(uint256 positionId) public pure returns (uint256) {
		return positionId * 2;
	}

	function sellerTokenId(uint256 positionId) public pure returns (uint256) {
		return positionId * 2 + 1;
	}

	function mintPosition(address buyer, address seller, uint256 positionId) external onlyMinter {
		if (buyer == address(0) || seller == address(0)) revert ZeroAddress();

		holders[positionId] = PositionHolders({buyer: buyer, seller: seller});
		_mint(buyer, buyerTokenId(positionId), 1, "");
		_mint(seller, sellerTokenId(positionId), 1, "");
	}

	function burnPosition(uint256 positionId) external onlyMinter {
		PositionHolders memory h = holders[positionId];
		uint256 bId = buyerTokenId(positionId);
		uint256 sId = sellerTokenId(positionId);

		if (h.buyer != address(0) && balanceOf(h.buyer, bId) > 0) {
			_burn(h.buyer, bId, 1);
		}
		if (h.seller != address(0) && balanceOf(h.seller, sId) > 0) {
			_burn(h.seller, sId, 1);
		}

		delete holders[positionId];
	}
}

