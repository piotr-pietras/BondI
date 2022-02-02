const BondI = artifacts.require("BondI");
const Usdc = artifacts.require("Usdc");
const BlockMiner = artifacts.require("BlockMiner");
const EI = require("../utils/EI");
const { fromWei, toWei, getBlock, mine, num } = require("../utils/functions");

contract("Bond force resolve ", async (accounts) => {
  let bondI;
  let usdc;
  let blockMiner;
  let ei;
  let creationBlock;

  before(async () => {
    usdc = await Usdc.deployed();
    bondI = await BondI.deployed();
    blockMiner = await BlockMiner.deployed();

    ei = new EI(
      accounts,
      usdc.address,
      30, //blocks until end of offering
      60 //blocks until bond expire
    );

    await bondI.issueBond(...ei.bondArgs);
    await bondI.lockEth({ from: ei.issuer, value: toWei(ei.ethLocked) });
    for (let i = 1; i < accounts.length; i++) {
      await usdc.transfer(accounts[i], ei.usdcBuyerUnits, { from: ei.owner });
    }
    for (let i = 3; i < accounts.length; i++) {
      await usdc.approve(bondI.address, ei.usdcBuyerUnits, {
        from: accounts[i],
      });
      await bondI.buyBond(ei.issuer, ei.bondBuyerUnits, { from: accounts[i] });
    }
    creationBlock = num(await bondI.bondInfo(ei.issuer, "creationBlock"));
  });

  describe("End of 'offering' phase...", async () => {
    let offeringBlocks;

    before(async () => {
      offeringBlocks = num(await bondI.bondInfo(ei.issuer, "offeringBlocks"));
      const to = creationBlock + offeringBlocks + 1;
      await mine(to, blockMiner);
    });

    it("starts 'usage' phase", async () => {
      const currentBlock = await getBlock();
      assert.isAtLeast(currentBlock, creationBlock + offeringBlocks);
    });

    it("prevents to buy bond", async () => {
      let error;
      await usdc.approve(bondI.address, ei.usdcBuyerUnits, {
        from: ei.testBuyer,
      });
      await bondI
        .buyBond(ei.issuer, ei.bondBuyerUnits, { from: ei.testBuyer })
        .catch((err) => (error = err));
      assert.isDefined(error);
    });

    it("prevents to sell bond in 'usage' phase", async () => {
      let error;
      await bondI
        .sellBond(ei.issuer, { from: ei.buyer })
        .catch((err) => (error = err));
      assert.isDefined(error);
    });
  });

  describe("End of 'usage' phase...", async () => {
    let expireBlocks;

    before(async () => {
      expireBlocks = num(await bondI.bondInfo(ei.issuer, "expireBlocks"));
      const to = creationBlock + expireBlocks + 1;
      await mine(to, blockMiner);
    });

    it("starts 'expire' phase", async () => {
      const currentBlock = await getBlock();
      assert.isAtLeast(currentBlock, creationBlock + expireBlocks);
    });

    it("prevents issuer from peaceful resolve", async () => {
      let error;
      const due = await bondI.totalDue(ei.issuer);
      await usdc.approve(bondI.address, due, { from: ei.issuer });
      await bondI
        .peacefulResolve({ from: ei.issuer })
        .catch((err) => (error = err));
      assert.isDefined(error);
    });
  });

  describe("Force resolve...", async () => {
    it("pays in locked eth", async () => {
      const prevBalance = await web3.eth.getBalance(ei.buyer);
      let gasUsed;
      await bondI
        .sellBond(ei.issuer, { from: ei.buyer })
        .then((res) => (gasUsed = res.receipt.gasUsed));
      const curBalance = await web3.eth.getBalance(ei.buyer);

      const dif = num(curBalance) - num(prevBalance) + gasUsed;
      console.log(`      <!> eth returned: ${fromWei(dif)} [eth]`);

      assert.closeTo(dif, toWei(ei.ethLocked) / ei.numberOfBuyers, 10 ** 6);
    });

    it("sets status to 52", async () => {
      const status = await bondI.bondInfo(ei.issuer, "status");
      assert.equal(status, 52);
    });

    it("prevents to sell bond again", async () => {
      let error;
      await bondI
        .sellBond(ei.issuer, { from: ei.buyer })
        .catch((err) => (error = err));
      assert.isDefined(error);
    });

    after(async () => {
      for (let i = ei.reservedAccounts; i < accounts.length; i++) {
        await bondI.sellBond(ei.issuer, { from: accounts[i] });
      }
    });
  });
});
