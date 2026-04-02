const { expect } = require("chai")
const { ethers } = require("hardhat")
const { time }   = require("@nomicfoundation/hardhat-network-helpers")

const ETH_USD_PRICE = 245000000000n  // $2,450.00 (8 decimals)
const USD_NGN_RATE  = 1650           // ₦1,650 per $1
const TIMEOUT       = 7 * 24 * 60 * 60
const NGN_PRICE     = 50000n         // ₦50,000 item price
const CID           = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"

describe("EscrowNG (with Chainlink)", function () {
  let contract, mockFeed, owner, seller, buyer, stranger
  let PRICE // ETH amount for ₦50,000 — computed after deploy

  beforeEach(async function () {
    ;[owner, seller, buyer, stranger] = await ethers.getSigners()

    // Deploy mock price feed — $2,450.00 ETH/USD
    const MockFeed = await ethers.getContractFactory("MockV3Aggregator")
    mockFeed = await MockFeed.deploy(8, ETH_USD_PRICE)
    await mockFeed.waitForDeployment()

    // Deploy EscrowNG with mock feed
    const EscrowNG = await ethers.getContractFactory("EscrowNG")
    contract = await EscrowNG.deploy(await mockFeed.getAddress(), USD_NGN_RATE)
    await contract.waitForDeployment()

    // Get the ETH equivalent of ₦50,000
    PRICE = await contract.ngnToEth(NGN_PRICE)
  })

  // ── 1. Price oracle ────────────────────────────────────────
  describe("Price oracle", function () {
    it("reads ETH/USD from mock feed", async function () {
      const price = await contract.getEthUsdPrice()
      expect(price).to.equal(ETH_USD_PRICE)
    })

    it("converts NGN to ETH correctly", async function () {
      // ₦50,000 / ₦1,650 per $ / $2,450 per ETH = ~0.01237 ETH
      const ethWei = await contract.ngnToEth(50000n)
      // Should be roughly 0.0124 ETH — just check it's in a reasonable range
      expect(ethWei).to.be.gt(ethers.parseEther("0.01"))
      expect(ethWei).to.be.lt(ethers.parseEther("0.02"))
    })

    it("ethToNgn round-trips back correctly", async function () {
      const ethWei = await contract.ngnToEth(NGN_PRICE)
      const backNgn = await contract.ethToNgn(ethWei)
      // Should be within 1 NGN of original (rounding)
      const diff = backNgn > NGN_PRICE ? backNgn - NGN_PRICE : NGN_PRICE - backNgn
      expect(diff).to.be.lte(1n)
    })

    it("reverts if price feed is stale", async function () {
      // Move time forward 2 hours — feed becomes stale
      await time.increase(7201)
      await expect(contract.getEthUsdPrice())
        .to.be.revertedWith("EscrowNG: price feed stale (>1hr)")
    })

    it("owner can update USD/NGN rate", async function () {
      await contract.connect(owner).setUsdNgnRate(1800)
      expect(await contract.usdNgnRate()).to.equal(1800)
    })

    it("non-owner cannot update rate", async function () {
      await expect(contract.connect(seller).setUsdNgnRate(1800))
        .to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount")
    })

    it("emits UsdNgnRateUpdated event", async function () {
      await expect(contract.connect(owner).setUsdNgnRate(1800))
        .to.emit(contract, "UsdNgnRateUpdated")
        .withArgs(USD_NGN_RATE, 1800)
    })
  })

  describe("createEscrow()", function () {
    it("creates escrow with NGN price and ETH amount", async function () {
      const tx = await contract.connect(seller).createEscrow(CID, NGN_PRICE, TIMEOUT, { value: PRICE })
      const r  = await tx.wait()
      const ev = r.logs.map(l => { try { return contract.interface.parseLog(l) } catch { return null } })
                       .find(e => e?.name === "EscrowCreated")

      expect(ev.args.ngnPrice).to.equal(NGN_PRICE)
      expect(ev.args.ethAmount).to.equal(PRICE)
    })

    it("stores ngnPrice in escrow struct", async function () {
      await contract.connect(seller).createEscrow(CID, NGN_PRICE, TIMEOUT, { value: PRICE })
      const e = await contract.getEscrow(0)
      expect(e.ngnPrice).to.equal(NGN_PRICE)
    })

    it("allows small ETH slippage (±2%)", async function () {
      const slightlyLess = PRICE * 9900n / 10000n  // 1% below
      await expect(
        contract.connect(seller).createEscrow(CID, NGN_PRICE, TIMEOUT, { value: slightlyLess })
      ).to.not.be.reverted
    })

    it("rejects ETH outside slippage range", async function () {
      const tooLittle = PRICE * 9700n / 10000n  // 3% below — exceeds 2% tolerance
      await expect(
        contract.connect(seller).createEscrow(CID, NGN_PRICE, TIMEOUT, { value: tooLittle })
      ).to.be.revertedWith("EscrowNG: ETH sent doesn't match NGN price")
    })

    it("reverts if NGN price below minimum", async function () {
      await expect(
        contract.connect(seller).createEscrow(CID, 50n, TIMEOUT, { value: PRICE })
      ).to.be.revertedWith("EscrowNG: price too low")
    })
  })

  async function createEscrow() {
    const tx = await contract.connect(seller).createEscrow(CID, NGN_PRICE, TIMEOUT, { value: PRICE })
    const r  = await tx.wait()
    const ev = r.logs.map(l => { try { return contract.interface.parseLog(l) } catch { return null } })
                     .find(e => e?.name === "EscrowCreated")
    return Number(ev.args.escrowId)
  }

  async function createAndDeposit() {
    const id = await createEscrow()
    await contract.connect(buyer).deposit(id, { value: PRICE })
    return id
  }

  describe("deposit()", function () {
    it("any buyer can deposit exact ETH amount", async function () {
      const id = await createEscrow()
      await contract.connect(buyer).deposit(id, { value: PRICE })
      const e = await contract.getEscrow(id)
      expect(e.buyer).to.equal(buyer.address)
      expect(e.status).to.equal(1) // ACTIVE
    })

    it("seller cannot buy own item", async function () {
      const id = await createEscrow()
      await expect(contract.connect(seller).deposit(id, { value: PRICE }))
        .to.be.revertedWith("EscrowNG: seller cannot buy own item")
    })

    it("wrong amount reverts", async function () {
      const id = await createEscrow()
      await expect(contract.connect(buyer).deposit(id, { value: PRICE / 2n }))
        .to.be.revertedWith("EscrowNG: must send exact ETH amount")
    })
  })

  describe("confirmDelivery()", function () {
    it("releases 2x ETH to seller", async function () {
      const id = await createAndDeposit()
      const before = await ethers.provider.getBalance(seller.address)
      await contract.connect(buyer).confirmDelivery(id)
      const after = await ethers.provider.getBalance(seller.address)
      expect(after - before).to.be.closeTo(PRICE * 2n, ethers.parseEther("0.001"))
    })

    it("marks COMPLETED", async function () {
      const id = await createAndDeposit()
      await contract.connect(buyer).confirmDelivery(id)
      expect(await contract.getEscrowStatus(id)).to.equal(2)
    })
  })

  describe("cancelEscrow()", function () {
    it("seller recovers ETH on cancel", async function () {
      const id     = await createEscrow()
      const before = await ethers.provider.getBalance(seller.address)
      const tx     = await contract.connect(seller).cancelEscrow(id)
      const r      = await tx.wait()
      const gas    = r.gasUsed * tx.gasPrice
      const after  = await ethers.provider.getBalance(seller.address)
      expect(after - before + gas).to.be.closeTo(PRICE, ethers.parseEther("0.001"))
      expect(await contract.getEscrowStatus(id)).to.equal(4) // CANCELLED
    })

    it("cannot cancel after buyer deposits", async function () {
      const id = await createAndDeposit()
      await expect(contract.connect(seller).cancelEscrow(id))
        .to.be.revertedWith("EscrowNG: invalid status")
    })
  })

  describe("claimRefund()", function () {
    it("buyer gets 2x ETH after timeout", async function () {
      const id = await createAndDeposit()
      await time.increase(TIMEOUT + 1)
      const before = await ethers.provider.getBalance(buyer.address)
      const tx     = await contract.connect(buyer).claimRefund(id)
      const r      = await tx.wait()
      const gas    = r.gasUsed * tx.gasPrice
      const after  = await ethers.provider.getBalance(buyer.address)
      expect(after - before + gas).to.be.closeTo(PRICE * 2n, ethers.parseEther("0.001"))
      expect(await contract.getEscrowStatus(id)).to.equal(3) // REFUNDED
    })

    it("reverts before timeout", async function () {
      const id = await createAndDeposit()
      await expect(contract.connect(buyer).claimRefund(id))
        .to.be.revertedWith("EscrowNG: timeout not expired yet")
    })
  })

  describe("ETH price volatility", function () {
    it("listing stays valid even if ETH price changes after creation", async function () {
      const id = await createEscrow()
      await mockFeed.updateAnswer(490000000000n) 
      await expect(
        contract.connect(buyer).deposit(id, { value: PRICE })
      ).to.not.be.reverted
    })
  })
})
