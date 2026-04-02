const { ethers, network } = require("hardhat")

// Chainlink ETH/USD feed addresses
const PRICE_FEEDS = {
  sepolia:   "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  localhost: null,
  hardhat:   null,
}

// Current USD/NGN rate — update this before deploying!
// Check live rate at: https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=NGN
const USD_NGN_RATE = 1450  // $1 = ₦1,450

async function main() {
  console.log(`  Deploying EscrowNG to: ${network.name}`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log("Deployer:", deployer.address)
  console.log("Balance: ", ethers.formatEther(balance), "ETH\n")

  if (balance === 0n) {
    throw new Error("Deployer has 0 ETH — fund your wallet first!")
  }

  let priceFeedAddress = PRICE_FEEDS[network.name]

  if (!priceFeedAddress) {
    console.log("Local network — deploying MockV3Aggregator...")
    const MockFeed = await ethers.getContractFactory("MockV3Aggregator")
    const mockFeed = await MockFeed.deploy(8, 245000000000n) // $2,450.00
    await mockFeed.waitForDeployment()
    priceFeedAddress = await mockFeed.getAddress()
    console.log("Mock ETH/USD feed deployed at:", priceFeedAddress)
    console.log("(simulating ETH price = $2,450.00)\n")
  } else {
    console.log("Using Chainlink ETH/USD feed:", priceFeedAddress, "\n")
  }

  // Deploy main contract
  const EscrowNG = await ethers.getContractFactory("EscrowNG")
  console.log("Deploying EscrowNG...")
  const contract = await EscrowNG.deploy(priceFeedAddress, USD_NGN_RATE)
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  const txHash  = contract.deploymentTransaction().hash

  console.log("\n✓ EscrowNG deployed!")
  console.log("  Address:     ", address)
  console.log("  TX Hash:     ", txHash)
  console.log("  USD/NGN Rate:", `₦${USD_NGN_RATE.toLocaleString()} per $1`)

  if (network.name === "sepolia") {
    console.log(`\n  Etherscan: https://sepolia.etherscan.io/address/${address}`)
  }

  // Sanity check
  try {
    const ethUsd  = await contract.getEthUsdPrice()
    const ethWei  = await contract.ngnToEth(50000n)
    console.log("\n  ── Conversion check ──")
    console.log(`  ETH/USD price: $${(Number(ethUsd) / 1e8).toFixed(2)}`)
    console.log(`  ₦50,000 = ${ethers.formatEther(ethWei)} ETH`)
    console.log(`  USD/NGN rate:  ₦${USD_NGN_RATE}`)
  } catch (e) {
    console.log("  (sanity check skipped:", e.message, ")")
  }

  console.log("  NEXT STEPS:")
  console.log(`  1. Copy this address: ${address}`)
  console.log(`  2. Paste into frontend .env:`)
  console.log(`     VITE_CONTRACT_ADDRESS=${address}`)
  console.log("  3. Run: npm run dev  (or npm run build for production)")

  if (network.name === "sepolia") {
    console.log("\n  To verify on Etherscan (optional):")
    console.log(`  npx hardhat verify --network sepolia ${address} "${priceFeedAddress}" "${USD_NGN_RATE}"`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error("\n✗ Failed:", e.message); process.exit(1) })
