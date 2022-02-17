const { toWei } = require("./functions");

//Extra Information
function EI(
  accounts,
  tokenAddress,
  offeringBlocks,
  expireBlocks,
  id = 1,
  issuedAmount = 500000,
  ethLocked = 10,
  sellRatioEth = 1,
  buybackRatioEth = 1.1,
  bondBuyerUnits = 10000
) {
  //----------------------------------------------------------------
  //Credibility
  //----------------------------------------------------------------
  this.title = "Coca-Cola bond:02/2022";
  this.issuer = "Issuer: Coca-Cola, CoO:United States... smth... smth...";
  this.description = "More information for credibilities... more.. more...";
  this.links = "to main site: link1.com, to site: www.link2.com,...";
  this.ethLocked = ethLocked;

  //----------------------------------------------------------------
  //Accounts & users
  //----------------------------------------------------------------
  this.numberOfAccounts = accounts.length;
  this.reservedAccounts = 4;
  this.owner = accounts[0];
  this.issuer = accounts[1];
  this.testBuyer = accounts[2];
  this.buyer = accounts[3];
  this.numberOfBuyers = this.numberOfAccounts - 3;

  //----------------------------------------------------------------
  //Bond's specification
  //----------------------------------------------------------------
  this.id = id;
  this.tokenAddress = tokenAddress;
  this.sellRatio = toWei(sellRatioEth);
  this.buybackRatio = toWei(buybackRatioEth);
  this.issuedAmount = issuedAmount;
  this.expireBlocks = expireBlocks;
  this.offeringBlocks = offeringBlocks;

  //----------------------------------------------------------------
  //Capital's tranfer specification
  //----------------------------------------------------------------
  this.bondBuyerUnits = bondBuyerUnits; // units of bond bought by one buyer
  this.usdcBuyerUnits = toWei(this.bondBuyerUnits * sellRatioEth); // tokens borrowed by one buyer
  this.expCapital = toWei(
    (this.numberOfBuyers * bondBuyerUnits * sellRatioEth).toFixed(3)
  ); // tokens collected by issuer
  this.expBuyback = toWei(
    (this.numberOfBuyers * bondBuyerUnits * buybackRatioEth).toFixed(3)
  ); // total expected buyback for bond's unit
  this.expBuyerBuyback = toWei(
    (this.bondBuyerUnits * buybackRatioEth).toFixed(3)
  ); // total expected buyback per buyer

  //----------------------------------------------------------------
  //Issue bond args
  //----------------------------------------------------------------
  this.bondArgs = [
    this.id,
    this.title,
    this.issuer,
    this.description,
    this.links,
    this.tokenAddress,
    this.issuedAmount,
    this.sellRatio,
    this.buybackRatio,
    this.offeringBlocks,
    this.expireBlocks,
    { from: this.issuer },
  ];
}

module.exports = EI;
