const BondI = artifacts.require("BondI");
const Usdc = artifacts.require("Usdc");
const EI = require("../utils/EI");
const { fromWei, toWei, getBlock, num } = require("../utils/functions");

contract("Issue bond & peacfull resolve", async (accounts) => {
  let bondI;
  let usdc;
  let ei;
  let creationBlock;

  before(async () => {
    usdc = await Usdc.deployed();
    bondI = await BondI.deployed();
    ei = new EI(accounts, usdc.address, 100, 1000);
  });

  describe("Preperations...", async () => {
    it("split usdc", async () => {
      for (let i = 1; i < accounts.length; i++) {
        await usdc.transfer(accounts[i], ei.usdcBuyerUnits, { from: ei.owner });
        assert.equal(await usdc.balanceOf(accounts[i]), ei.usdcBuyerUnits);
      }
    });
  });

  describe("Issue bond...", async () => {
    it("is a success", async () => {
      const isIssued = await bondI.issueBond(...ei.bondArgs);
      creationBlock = num(await bondI.bondInfo(ei.issuer, "creationBlock"));
      assert.equal(isIssued.logs[0].event, "BondIssued");
    });

    it("on existing bond is a failure", async () => {
      let error;
      await bondI.issueBond(...ei.bondArgs).catch((err) => (error = err));
      assert.isDefined(error);
    });
  });

  describe("Lock Eth...", async () => {
    it("is a success", async () => {
      await bondI.lockEth({ from: ei.issuer, value: toWei(ei.ethLocked) });
      const ethLocked = await bondI.ethLocked(ei.issuer);
      assert.equal(num(ethLocked), num(toWei(ei.ethLocked)));
    });

    it("on existing bond is a success", async () => {
      await bondI.lockEth({ from: ei.issuer, value: toWei(ei.ethLocked) });
      const ethLocked = await bondI.ethLocked(ei.issuer);
      assert.equal(num(ethLocked), num(toWei(2 * ei.ethLocked)));
    });
  });

  describe("Unlock Eth...", async () => {
    it("before resolve is a failure", async () => {
      let error;
      await bondI.unlockEth({ from: ei.issuer }).catch((err) => (error = err));
      assert.isDefined(error);
    });
  });

  describe("Buy bond...", async () => {
    it("1) USDC tokens successfully send to BondI", async () => {
      await usdc.approve(bondI.address, ei.usdcBuyerUnits, { from: ei.buyer });
      await bondI.buyBond(ei.issuer, ei.bondBuyerUnits, { from: ei.buyer });
      const balance = await usdc.balanceOf(bondI.address);
      assert.equal(balance, num(toWei(ei.bondBuyerUnits)));
    });

    it("2) untis of bond successfully transfered to buyer", async () => {
      const units = await bondI.buyers(ei.issuer, ei.buyer);
      assert.equal(num(units), ei.bondBuyerUnits);
    });

    it("3) current amount of bonds units decreased", async () => {
      const amount = await bondI.bondInfo(ei.issuer, "issuedAmount");
      const currentAmount = await bondI.bondInfo(ei.issuer, "currentAmount");
      assert.isBelow(num(currentAmount), num(amount));
    });

    //Rest of buyers buy bond
    after(async () => {
      for (let i = ei.reservedAccounts; i < accounts.length; i++) {
        await usdc.approve(bondI.address, ei.usdcBuyerUnits, {
          from: accounts[i],
        });
        await bondI.buyBond(ei.issuer, ei.bondBuyerUnits, {
          from: accounts[i],
        });
      }
    });
  });

  describe("Collect capital by issuer...", async () => {
    it("is equel to expected one", async () => {
      await bondI.collectCapital({ from: ei.issuer });
      const balance = await usdc.balanceOf(ei.issuer);
      assert.isAtLeast(num(balance), num(ei.expCapital));
    });

    it("twice is a failure", async () => {
      let error;
      await bondI
        .collectCapital({ from: ei.issuer })
        .catch((err) => (error = err));
      assert.isDefined(error);
    });

    it("ends 'offering' phase", async () => {
      const offerBlocks = num(await bondI.bondInfo(ei.issuer, "offerBlocks"));
      const currentBlock = await getBlock();
      assert.isAtLeast(currentBlock, creationBlock + offerBlocks);
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
      const balance = await usdc.balanceOf(ei.testBuyer);
      assert.equal(num(balance), num(ei.usdcBuyerUnits));
    });
  });

  describe("Peaceful resolve...", async () => {
    let due;

    before(async () => {
      due = await bondI.totalDue(ei.issuer);
      const balance = await usdc.balanceOf(ei.issuer);
      console.log(`      <?> issuer balance: ${fromWei(balance)} [tokens]`);
      console.log(`      <?> issuer due: ${fromWei(due)} [tokens]`);
      console.log(
        `      <?> bond's total yield: ${
          fromWei(balance) - fromWei(due)
        } [tokens]`
      );
    });

    it("equels expected", async () => {
      assert.equal(num(due), num(ei.expBuyback));
    });

    it("is available by USDC token approval", async () => {
      await usdc.approve(bondI.address, due, { from: ei.issuer });
      const allowance = await usdc.allowance(ei.issuer, bondI.address);
      assert.equal(num(due), num(allowance));
    });

    it("is a success", async () => {
      await bondI.peacefulResolve({ from: ei.issuer });
      const balance = await usdc.balanceOf(bondI.address);
      assert.equal(num(balance), num(ei.expBuyback));
    });

    it("sets phase to 'expired'", async () => {
      const expireBlocks = num(await bondI.bondInfo(ei.issuer, "expireBlocks"));
      const currentBlock = await getBlock();
      assert.isAtLeast(currentBlock, creationBlock + expireBlocks);
    });

    it("sets status to 51", async () => {
      const status = await bondI.bondInfo(ei.issuer, "status");
      assert.equal(status, 51);
    });
  });

  describe("Sell bond...", async () => {
    it("is succesful", async () => {
      for (let i = ei.reservedAccounts; i < accounts.length; i++) {
        await bondI.sellBond(ei.issuer, { from: accounts[i] });
        const balance = await usdc.balanceOf(accounts[i]);
        assert.equal(balance, ei.expBuyerBuyback);
      }
    });

    it("unlocks issuer's eth", async () => {
      let error;
      await bondI.unlockEth({ from: ei.issuer }).catch((err) => (error = err));
      assert.isUndefined(error);
    });
  });
});
