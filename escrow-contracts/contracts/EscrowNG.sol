// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract EscrowNG is ReentrancyGuard, Ownable, Pausable {

    enum Status {
        PENDING,    // 0 - Listed, and is open for any buyer. Seller can cancel.
        ACTIVE,     // 1 - Buyer has deposited. Timeout counting. Locked.
        COMPLETED,  // 2 - Delivery confirmed. Funds return to seller.
        REFUNDED,   // 3 - Buyer refunded after timeout.
        CANCELLED   // 4 - Seller cancelled before any buyer.
    }

    struct Escrow {
        uint256 id;
        address payable seller;
        address payable buyer;
        uint256 ngnPrice;
        uint256 amount;
        string  cid;
        Status  status;
        uint256 createdAt;
        uint256 depositedAt;
        uint256 timeoutDuration;
    }

    AggregatorV3Interface public immutable priceFeed;
    uint256 public usdNgnRate;
    uint256 public constant SLIPPAGE_BPS = 200;
    uint256 public escrowCount;
    mapping(uint256 => Escrow) private escrows;
    uint256 public constant MIN_TIMEOUT =  1 days;
    uint256 public constant MAX_TIMEOUT = 30 days;
    uint256 public constant MIN_NGN     =  100;

    event EscrowCreated(uint256 indexed escrowId, address indexed seller, uint256 ngnPrice, uint256 ethAmount, string cid);
    event DepositMade(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event DeliveryConfirmed(uint256 indexed escrowId);
    event FundsReleased(uint256 indexed escrowId, address indexed seller, uint256 amount);
    event RefundIssued(uint256 indexed escrowId, address indexed buyer, uint256 amount);
    event EscrowCancelled(uint256 indexed escrowId, address indexed seller, uint256 amount);
    event UsdNgnRateUpdated(uint256 oldRate, uint256 newRate);


    modifier escrowExists(uint256 escrowId) {
        require(escrowId < escrowCount, "escrow does not exist");
        _;
    }
    modifier onlySeller(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].seller, "not the seller");
        _;
    }
    modifier onlyBuyer(uint256 escrowId) {
        require(msg.sender == escrows[escrowId].buyer, "not the buyer");
        _;
    }
    modifier inStatus(uint256 escrowId, Status expected) {
        require(escrows[escrowId].status == expected, "invalid status");
        _;
    }

    constructor(address _priceFeed, uint256 _usdNgnRate) Ownable(msg.sender) {
        require(_priceFeed != address(0), "invalid feed address");
        require(_usdNgnRate > 0, "invalid NGN rate");
        priceFeed  = AggregatorV3Interface(_priceFeed);
        usdNgnRate = _usdNgnRate;
    }

    function getEthUsdPrice() public view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = priceFeed.latestRoundData();
        require(answer > 0, "invalid price feed");
        require(block.timestamp - updatedAt < 3600, "price feed stale");
        return uint256(answer);
    }

    function ngnToEth(uint256 ngnAmount) public view returns (uint256 ethWei) {
        uint256 ethUsdPrice = getEthUsdPrice();
        ethWei = (ngnAmount * 1e18 * 1e8) / (usdNgnRate * ethUsdPrice);
    }

    function ethToNgn(uint256 ethWei) public view returns (uint256 ngn) {
        uint256 ethUsdPrice = getEthUsdPrice();
        ngn = (ethWei * ethUsdPrice * usdNgnRate) / (1e18 * 1e8);
    }

    function createEscrow(
        string  calldata cid,
        uint256 ngnPrice,
        uint256 timeoutDuration
    )
        external
        payable
        whenNotPaused
        returns (uint256 escrowId)
    {
        require(bytes(cid).length > 0, "CID cannot be empty");
        require(ngnPrice >= MIN_NGN, "price too low (min 100 NGN)");
        require(timeoutDuration >= MIN_TIMEOUT, "timeout too short");
        require(timeoutDuration <= MAX_TIMEOUT, "timeout too long");

        uint256 requiredEth = ngnToEth(ngnPrice);
        uint256 minAccepted = requiredEth * (10000 - SLIPPAGE_BPS) / 10000;
        uint256 maxAccepted = requiredEth * (10000 + SLIPPAGE_BPS) / 10000;

        require(
            msg.value >= minAccepted && msg.value <= maxAccepted,
            "ETH sent does not match NGN price"
        );

        escrowId = escrowCount;
        escrowCount++;

        escrows[escrowId] = Escrow({
            id:              escrowId,
            seller:          payable(msg.sender),
            buyer:           payable(address(0)),
            ngnPrice:        ngnPrice,
            amount:          msg.value,
            cid:             cid,
            status:          Status.PENDING,
            createdAt:       block.timestamp,
            depositedAt:     0,
            timeoutDuration: timeoutDuration
        });

        emit EscrowCreated(escrowId, msg.sender, ngnPrice, msg.value, cid);
    }

    function cancelEscrow(uint256 escrowId)
        external
        nonReentrant
        escrowExists(escrowId)
        onlySeller(escrowId)
        inStatus(escrowId, Status.PENDING)
    {
        Escrow storage e = escrows[escrowId];
        uint256 refund   = e.amount;
        e.status         = Status.CANCELLED;
        (bool ok,) = e.seller.call{value: refund}("");
        require(ok, "EscrowNG: cancel refund failed");
        emit EscrowCancelled(escrowId, e.seller, refund);
    }

    function deposit(uint256 escrowId)
        external
        payable
        nonReentrant
        whenNotPaused
        escrowExists(escrowId)
        inStatus(escrowId, Status.PENDING)
    {
        Escrow storage e = escrows[escrowId];
        require(msg.sender != e.seller, "seller cannot buy own item");
        require(msg.value == e.amount, " must send exact ETH amount");
        e.buyer = payable(msg.sender);
        e.status = Status.ACTIVE;
        e.depositedAt = block.timestamp;
        emit DepositMade(escrowId, msg.sender, msg.value);
    }

    function confirmDelivery(uint256 escrowId)
        external
        nonReentrant
        whenNotPaused
        escrowExists(escrowId)
        onlyBuyer(escrowId)
        inStatus(escrowId, Status.ACTIVE)
    {
        Escrow storage e   = escrows[escrowId];
        uint256 totalFunds = e.amount * 2;
        e.status           = Status.COMPLETED;
        emit DeliveryConfirmed(escrowId);
        (bool ok,) = e.seller.call{value: totalFunds}("");
        require(ok, "seller transfer failed");
        emit FundsReleased(escrowId, e.seller, totalFunds);
    }

    function claimRefund(uint256 escrowId)
        external
        nonReentrant
        escrowExists(escrowId)
        onlyBuyer(escrowId)
        inStatus(escrowId, Status.ACTIVE)
    {
        Escrow storage e = escrows[escrowId];
        require(
            block.timestamp >= e.depositedAt + e.timeoutDuration,
            "timeout not expired yet"
        );
        uint256 totalFunds = e.amount * 2;
        e.status           = Status.REFUNDED;
        (bool ok,) = e.buyer.call{value: totalFunds}("");
        require(ok, "refund transfer failed");
        emit RefundIssued(escrowId, e.buyer, totalFunds);
    }

    function getEscrow(uint256 escrowId)
        external
        view
        escrowExists(escrowId)
        returns (
            uint256 id,
            address seller,
            address buyer,
            uint256 ngnPrice,
            uint256 amount,
            string  memory cid,
            uint8   status,
            uint256 createdAt,
            uint256 depositedAt,
            uint256 timeoutDuration
        )
    {
        Escrow storage e = escrows[escrowId];
        return (
            e.id, e.seller, e.buyer,
            e.ngnPrice, e.amount, e.cid,
            uint8(e.status), e.createdAt,
            e.depositedAt, e.timeoutDuration
        );
    }

    function getEscrowStatus(uint256 escrowId)
        external view escrowExists(escrowId) returns (uint8)
    {
        return uint8(escrows[escrowId].status);
    }

    function isTimedOut(uint256 escrowId)
        external view escrowExists(escrowId) returns (bool)
    {
        Escrow storage e = escrows[escrowId];
        if (e.status != Status.ACTIVE) return false;
        return block.timestamp >= e.depositedAt + e.timeoutDuration;
    }


    function setUsdNgnRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "rate must be > 0");
        emit UsdNgnRateUpdated(usdNgnRate, newRate);
        usdNgnRate = newRate;
    }

    function pause()   external onlyOwner { _pause();   }
    function unpause() external onlyOwner { _unpause(); }

    receive()  external payable { revert("use createEscrow() or deposit()"); }
    fallback() external payable { revert("function not found"); }
}