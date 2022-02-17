const BondI = artifacts.require("BondI");
const Usdc = artifacts.require("Usdc");
const BlockMiner = artifacts.require("BlockMiner");
const EI = require("../utils/EI");
const { fromWei, toWei, getBlock, num, mine } = require("../utils/functions");

contract("Issue multiple bonds from one issuer", async (accounts) => {
  before(async () => {
    usdc = await Usdc.deployed();
    bondI = await BondI.deployed();
    blockMiner = await BlockMiner.deployed();
    ei1 = new EI(
      accounts,
      usdc.address,
      100, //blocks until end of offering
      1000, //blocks until bond expire
      1
    );
    ei2 = new EI(
      accounts,
      usdc.address,
      40, //blocks until end of offering
      60, //blocks until bond expire
      2
    );

    for (let i = 1; i < accounts.length; i++) {
      await usdc.transfer(accounts[i], ei1.usdcBuyerUnits, {
        from: ei1.owner,
      });
      await usdc.transfer(accounts[i], ei2.usdcBuyerUnits, {
        from: ei2.owner,
      });
    }
  });

  describe("Issue bond...", async () => {
    it("first one is a success", async () => {
      const isIssued = await bondI.issueBond(...ei1.bondArgs);
      creationBlock = num(
        await bondI.bondInfo(ei1.issuer, ei1.id, "creationBlock")
      );
      assert.equal(isIssued.logs[0].event, "BondIssued");
    });

    it("second one is a success", async () => {
      const isIssued = await bondI.issueBond(...ei2.bondArgs);
      creationBlock = num(
        await bondI.bondInfo(ei2.issuer, ei2.id, "creationBlock")
      );
      assert.equal(isIssued.logs[0].event, "BondIssued");
    });

    it("locked eth for second one is success", async () => {
      await bondI.lockEth(ei2.id, {
        from: ei2.issuer,
        value: toWei(ei2.ethLocked),
      });
      const ethLocked = await bondI.ethLocked(ei2.issuer, ei2.id);
      assert.equal(num(ethLocked), num(toWei(ei2.ethLocked)));
    });
  });

  describe("Buy bond", async () => {
    it("first one is a success", async () => {
      for (let i = 3; i < accounts.length; i++) {
        await usdc.approve(bondI.address, ei1.usdcBuyerUnits, {
          from: accounts[i],
        });
        await bondI.buyBond(ei1.issuer, ei1.id, ei1.bondBuyerUnits, {
          from: accounts[i],
        });
        const units = await bondI.buyers(ei1.issuer, ei1.id, ei1.buyer);
        assert.equal(num(units), ei1.bondBuyerUnits);
      }
    });

    it("second one is a success", async () => {
      for (let i = 3; i < accounts.length; i++) {
        await usdc.approve(bondI.address, ei2.usdcBuyerUnits, {
          from: accounts[i],
        });
        await bondI.buyBond(ei2.issuer, ei2.id, ei2.bondBuyerUnits, {
          from: accounts[i],
        });
        const units = await bondI.buyers(ei2.issuer, ei2.id, ei2.buyer);
        assert.equal(num(units), ei2.bondBuyerUnits);
      }
    });
  });

  describe("Collect capital by issuer...", async () => {
    it("from first bond is equel to expected one", async () => {
      await bondI.collectCapital(ei1.id, { from: ei1.issuer });
      const balance = await usdc.balanceOf(ei1.issuer);
      assert.isAtLeast(num(balance), num(ei1.expCapital));
    });
    it("from second bond is equel to expected one", async () => {
      await bondI.collectCapital(ei2.id, { from: ei2.issuer });
      const balance = await usdc.balanceOf(ei2.issuer);
      const exp = num(ei1.expCapital) + num(ei2.expCapital);
      assert.isAtLeast(num(balance), exp);
    });
  });

  describe("Peacful resolve first bond...", async () => {
    it("is success", async () => {
      const due = await bondI.totalDue(ei1.issuer, ei1.id);
      await usdc.approve(bondI.address, due, { from: ei1.issuer });
      await bondI.peacefulResolve(ei1.id, { from: ei1.issuer });
      const balance = await usdc.balanceOf(bondI.address);
      assert.equal(num(balance), num(ei1.expBuyback));
    });
    it("sets phase to 'expired'", async () => {
      const creationBlock = num(
        await bondI.bondInfo(ei1.issuer, ei1.id, "creationBlock")
      );
      const expireBlocks = num(
        await bondI.bondInfo(ei1.issuer, ei1.id, "expireBlocks")
      );
      const currentBlock = await getBlock();
      assert.isAtLeast(currentBlock, creationBlock + expireBlocks);
    });
  });

  describe("Sell first bond...", async () => {
    it("is succesful", async () => {
      for (let i = ei1.reservedAccounts; i < accounts.length; i++) {
        await bondI.sellBond(ei1.issuer, ei1.id, { from: accounts[i] });
        const balance = await usdc.balanceOf(accounts[i]);
        assert.equal(balance, ei1.expBuyerBuyback);
      }
    });
  });

  describe("End of 'usage' phase of second bond...", async () => {
    let expireBlocks;

    before(async () => {
      expireBlocks = num(
        await bondI.bondInfo(ei2.issuer, ei2.id, "expireBlocks")
      );
      const to = creationBlock + expireBlocks + 1;
      await mine(to, blockMiner);
    });

    it("starts 'expire' phase", async () => {
      const currentBlock = await getBlock();
      assert.isAtLeast(currentBlock, creationBlock + expireBlocks);
    });

    it("prevents issuer from peaceful resolve", async () => {
      let error;
      const due = await bondI.totalDue(ei2.issuer, ei2.id);
      await usdc.approve(bondI.address, due, { from: ei2.issuer });
      await bondI
        .peacefulResolve(ei2.id, { from: ei2.issuer })
        .catch((err) => (error = err));
      assert.isDefined(error);
    });
  });

  describe("Force resolve second bond...", async () => {
    it("pays in locked eth", async () => {
      const prevBalance = await web3.eth.getBalance(ei2.buyer);
      let gasUsed;
      await bondI
        .sellBond(ei2.issuer, ei2.id, { from: ei2.buyer })
        .then((res) => (gasUsed = res.receipt.gasUsed));
      const curBalance = await web3.eth.getBalance(ei2.buyer);

      const dif = num(curBalance) - num(prevBalance) + gasUsed;
      console.log(`      <!> eth returned: ${fromWei(dif)} [eth]`);

      assert.closeTo(dif, toWei(ei2.ethLocked) / ei2.numberOfBuyers, 10 ** 6);
    });

    it("sets status to 52", async () => {
      const status = await bondI.bondInfo(ei2.issuer, ei2.id, "status");
      assert.equal(status, 52);
    });
  });
});
