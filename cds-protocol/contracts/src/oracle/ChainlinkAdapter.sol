// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface AggregatorV3Interface {
	function latestRoundData()
		external
		view
		returns (uint80, int256, uint256, uint256, uint80);

	function decimals() external view returns (uint8);
}

contract ChainlinkAdapter is Ownable {
	mapping(address => address) public feedByAsset;

	event FeedSet(address indexed asset, address indexed feed);

	error FeedNotSet(address asset);
	error InvalidPrice(address asset, int256 answer);

	constructor(address _owner) Ownable(_owner) {}

	function setFeed(address asset, address feed) external onlyOwner {
		feedByAsset[asset] = feed;
		emit FeedSet(asset, feed);
	}

	function getLatestPrice(address asset) external view returns (uint256 price, uint8 decimals_) {
		address feed = feedByAsset[asset];
		if (feed == address(0)) revert FeedNotSet(asset);

		(, int256 answer,,,) = AggregatorV3Interface(feed).latestRoundData();
		if (answer <= 0) revert InvalidPrice(asset, answer);

		// Safe cast because answer is checked to be strictly positive above.
		// forge-lint: disable-next-line(unsafe-typecast)
		return (uint256(answer), AggregatorV3Interface(feed).decimals());
	}
}

