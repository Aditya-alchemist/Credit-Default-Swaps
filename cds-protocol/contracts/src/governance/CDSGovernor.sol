// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CDSGovernor is Ownable {
	enum ProposalState {
		PENDING,
		ACTIVE,
		SUCCEEDED,
		DEFEATED,
		QUEUED,
		EXECUTED,
		CANCELED
	}

	struct Proposal {
		address proposer;
		address target;
		uint256 value;
		bytes data;
		string description;
		uint256 startTime;
		uint256 endTime;
		uint256 eta;
		uint256 forVotes;
		uint256 againstVotes;
		bool executed;
		bool canceled;
	}

	// forge-lint: disable-next-line(screaming-snake-case-immutable)
	IERC20 public immutable govToken;

	uint256 public votingDelay = 1 days;
	uint256 public votingPeriod = 3 days;
	uint256 public timelockDelay = 48 hours;
	uint256 public proposalThreshold = 10_000e18;

	uint256 public nextProposalId = 1;
	mapping(uint256 => Proposal) public proposals;
	mapping(uint256 => mapping(address => bool)) public hasVoted;

	event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
	event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
	event ProposalQueued(uint256 indexed proposalId, uint256 eta);
	event ProposalExecuted(uint256 indexed proposalId);
	event ProposalCanceled(uint256 indexed proposalId);

	error InsufficientProposalPower();
	error ProposalNotActive();
	error AlreadyVoted();
	error ProposalNotSuccessful();
	error TimelockNotElapsed();
	error ProposalNotQueued();
	error CallFailed();

	constructor(address _govToken, address _owner) Ownable(_owner) {
		govToken = IERC20(_govToken);
	}

	function setGovernanceParams(
		uint256 _votingDelay,
		uint256 _votingPeriod,
		uint256 _timelockDelay,
		uint256 _proposalThreshold
	) external onlyOwner {
		votingDelay = _votingDelay;
		votingPeriod = _votingPeriod;
		timelockDelay = _timelockDelay;
		proposalThreshold = _proposalThreshold;
	}

	function propose(address target, uint256 value, bytes calldata data, string calldata description)
		external
		returns (uint256 proposalId)
	{
		uint256 votingPower = govToken.balanceOf(msg.sender);
		if (votingPower < proposalThreshold) revert InsufficientProposalPower();

		proposalId = nextProposalId++;
		Proposal storage p = proposals[proposalId];
		p.proposer = msg.sender;
		p.target = target;
		p.value = value;
		p.data = data;
		p.description = description;
		p.startTime = block.timestamp + votingDelay;
		p.endTime = p.startTime + votingPeriod;

		emit ProposalCreated(proposalId, msg.sender, description);
	}

	function castVote(uint256 proposalId, bool support) external {
		Proposal storage p = proposals[proposalId];
		if (state(proposalId) != ProposalState.ACTIVE) revert ProposalNotActive();
		if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

		uint256 votingPower = govToken.balanceOf(msg.sender);
		hasVoted[proposalId][msg.sender] = true;

		if (support) {
			p.forVotes += votingPower;
		} else {
			p.againstVotes += votingPower;
		}

		emit VoteCast(proposalId, msg.sender, support, votingPower);
	}

	function queue(uint256 proposalId) external {
		Proposal storage p = proposals[proposalId];
		if (state(proposalId) != ProposalState.SUCCEEDED) revert ProposalNotSuccessful();

		p.eta = block.timestamp + timelockDelay;
		emit ProposalQueued(proposalId, p.eta);
	}

	function execute(uint256 proposalId) external {
		Proposal storage p = proposals[proposalId];
		if (p.eta == 0) revert ProposalNotQueued();
		if (block.timestamp < p.eta) revert TimelockNotElapsed();
		if (p.executed || p.canceled) revert ProposalNotSuccessful();

		p.executed = true;
		(bool ok,) = p.target.call{value: p.value}(p.data);
		if (!ok) revert CallFailed();

		emit ProposalExecuted(proposalId);
	}

	function cancel(uint256 proposalId) external onlyOwner {
		Proposal storage p = proposals[proposalId];
		p.canceled = true;
		emit ProposalCanceled(proposalId);
	}

	function state(uint256 proposalId) public view returns (ProposalState) {
		Proposal memory p = proposals[proposalId];

		if (p.canceled) return ProposalState.CANCELED;
		if (p.executed) return ProposalState.EXECUTED;
		if (p.startTime == 0) return ProposalState.CANCELED;
		if (block.timestamp < p.startTime) return ProposalState.PENDING;
		if (block.timestamp <= p.endTime) return ProposalState.ACTIVE;
		if (p.forVotes <= p.againstVotes) return ProposalState.DEFEATED;
		if (p.eta == 0) return ProposalState.SUCCEEDED;
		return ProposalState.QUEUED;
	}

	receive() external payable {}
}

