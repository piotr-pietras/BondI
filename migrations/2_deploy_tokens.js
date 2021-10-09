const BondI = artifacts.require('BondI')

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(BondI)
};
