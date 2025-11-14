// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GroupBuy is ReentrancyGuard {
    // ---------------------------------------------------------
    // STRUCTS
    // ---------------------------------------------------------
    struct Campaign {
        address organizer;       // first buyer (creator)
        address company;         // company receiving funds
        uint256 unitPrice;       // price per product (in wei)
        uint256 goal;            // number of buyers required (MOQ)
        uint256 committed;       // number of buyers committed
        uint256 collectedWei;    // total ETH collected
        uint256 deadline;        // UNIX timestamp
        bool successful;         // true if MOQ reached
        bool released;           // true if funds sent to company
    }

    // ---------------------------------------------------------
    // STATE VARIABLES
    // ---------------------------------------------------------
    uint256 public nextCampaignId;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public hasCommitted;
    mapping(uint256 => mapping(address => bool)) public hasRefunded;

    // ---------------------------------------------------------
    // EVENTS
    // ---------------------------------------------------------
    event CampaignCreated(
        uint256 indexed id,
        address indexed organizer,
        address indexed company,
        uint256 unitPrice,
        uint256 goal,
        uint256 deadline
    );
    event CommitmentMade(
        uint256 indexed id,
        address indexed buyer,
        uint256 totalCommitted
    );
    event FundsReleased(
        uint256 indexed id,
        address indexed company,
        uint256 amount
    );
    event RefundIssued(
        uint256 indexed id,
        address indexed buyer,
        uint256 amount
    );

    // ---------------------------------------------------------
    // CORE LOGIC
    // ---------------------------------------------------------
    function commit(
        uint256 id,
        address company,
        uint256 unitPrice,
        uint256 goal,
        // --- CHANGE #1: The parameter is renamed for clarity. It now represents seconds. ---
        uint256 durationSeconds
    ) external payable nonReentrant {
        Campaign storage c = campaigns[id];

        // Create new campaign if not yet initialized
        if (c.organizer == address(0)) {
            require(company != address(0), "Invalid company address");
            require(unitPrice > 0, "Unit price must be > 0");
            require(goal > 0, "Goal must be > 0");

            // --- CHANGE #2: This check is removed to allow a duration of 0 for testing. ---
            // require(durationDays > 0, "Duration must be > 0");

            c.organizer = msg.sender;
            c.company = company;
            c.unitPrice = unitPrice;
            c.goal = goal;

            // --- CHANGE #3: The deadline calculation now uses seconds directly. ---
            c.deadline = block.timestamp + durationSeconds;

            emit CampaignCreated(id, msg.sender, company, unitPrice, goal, c.deadline);
        }

        // Validation
        require(block.timestamp <= c.deadline, "Campaign expired");
        require(!c.successful, "Campaign already successful");
        require(msg.value == c.unitPrice, "Incorrect ETH amount");
        require(!hasCommitted[id][msg.sender], "Already committed");

        // Record buyer participation
        hasCommitted[id][msg.sender] = true;
        c.committed++;
        c.collectedWei += msg.value;

        emit CommitmentMade(id, msg.sender, c.committed);

        // Automatically release funds if MOQ reached
        if (c.committed >= c.goal && !c.released) {
            c.successful = true;
            c.released = true;
            uint256 amount = c.collectedWei;
            c.collectedWei = 0;
            (bool sent, ) = payable(c.company).call{value: amount}("");
            require(sent, "Transfer to company failed");
            emit FundsReleased(id, c.company, amount);
        }
    }

    // ---------------------------------------------------------
    // REFUND LOGIC
    // ---------------------------------------------------------
    function refund(uint256 id) external nonReentrant {
        Campaign storage c = campaigns[id];
        require(c.organizer != address(0), "Campaign does not exist");
        require(block.timestamp > c.deadline, "Campaign still active");
        require(!c.successful, "Goal reached - no refunds");
        require(hasCommitted[id][msg.sender], "No commitment found");
        require(!hasRefunded[id][msg.sender], "Already refunded");
        hasRefunded[id][msg.sender] = true;
        uint256 refundAmount = c.unitPrice;
        c.collectedWei -= refundAmount;
        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "Refund transfer failed");
        emit RefundIssued(id, msg.sender, refundAmount);
    }

    // ---------------------------------------------------------
    // READ-ONLY VIEW FUNCTIONS
    // ---------------------------------------------------------
    function getProgress(uint256 id)
        external
        view
        returns (
            address organizer,
            address company,
            uint256 committed,
            uint256 goal,
            uint256 deadline,
            bool successful
        )
    {
        Campaign storage c = campaigns[id];
        return (c.organizer, c.company, c.committed, c.goal, c.deadline, c.successful);
    }

    // ---------------------------------------------------------
    // SAFETY
    // ---------------------------------------------------------
    receive() external payable {
        revert("Use commit() to participate");
    }

    fallback() external payable {
        revert("Invalid function call");
    }
}