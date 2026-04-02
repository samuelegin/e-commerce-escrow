export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0x0000000000000000000000000000000000000000'

export const ABI = [
  // Events
  'event EscrowCreated(uint256 indexed escrowId, address indexed seller, uint256 ngnPrice, uint256 ethAmount, string cid)',
  'event DepositMade(uint256 indexed escrowId, address indexed buyer, uint256 amount)',
  'event DeliveryConfirmed(uint256 indexed escrowId)',
  'event FundsReleased(uint256 indexed escrowId, address indexed seller, uint256 amount)',
  'event RefundIssued(uint256 indexed escrowId, address indexed buyer, uint256 amount)',
  'event EscrowCancelled(uint256 indexed escrowId, address indexed seller, uint256 amount)',
  'event UsdNgnRateUpdated(uint256 oldRate, uint256 newRate)',

  // Read
  'function escrowCount() external view returns (uint256)',
  'function usdNgnRate() external view returns (uint256)',
  'function getEthUsdPrice() external view returns (uint256)',
  'function ngnToEth(uint256 ngnAmount) external view returns (uint256)',
  'function ethToNgn(uint256 ethWei) external view returns (uint256)',
  'function getEscrow(uint256 escrowId) external view returns (uint256 id, address seller, address buyer, uint256 ngnPrice, uint256 amount, string memory cid, uint8 status, uint256 createdAt, uint256 depositedAt, uint256 timeoutDuration)',
  'function isTimedOut(uint256 escrowId) external view returns (bool)',

  // Write
  'function createEscrow(string memory cid, uint256 ngnPrice, uint256 timeoutDuration) external payable returns (uint256)',
  'function cancelEscrow(uint256 escrowId) external',
  'function deposit(uint256 escrowId) external payable',
  'function confirmDelivery(uint256 escrowId) external',
  'function claimRefund(uint256 escrowId) external',

  // Owner
  'function setUsdNgnRate(uint256 newRate) external',
]

export const STATUS       = { PENDING: 0, ACTIVE: 1, COMPLETED: 2, REFUNDED: 3, CANCELLED: 4 }
export const STATUS_LABEL = { 0: 'Pending', 1: 'Active', 2: 'Completed', 3: 'Refunded', 4: 'Cancelled' }
export const STATUS_BADGE = { 0: 'badge-pending', 1: 'badge-active', 2: 'badge-completed', 3: 'badge-refunded', 4: 'badge-cancelled' }
