const BondI = artifacts.require('BondI')
const Usdc = artifacts.require('Usdc')
const BlockMiner = artifacts.require('BlockMiner')

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Usdc, 'Usdc', 'Usdc')
  await deployer.deploy(BondI)
  await deployer.deploy(BlockMiner)
};
