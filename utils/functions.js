const toWei = (value) => web3.utils.toWei(value.toString(), "ether");
const fromWei = (value) => web3.utils.fromWei(value.toString(), "ether");

const getBlock = async () => {
  const block = await web3.eth
    .getBlock("latest")
    .then((resolve) => resolve.number);
  console.log(`      <?> current block is ${block}`);
  return block;
};

const mine = async (to, blockMiner) => {
  const currentBlock = await getBlock();
  const toMine = to - currentBlock + 1;
  let i;
  for (i = 0; i < toMine; i++) {
    await blockMiner.mine();
  }
  console.log(`      <!> blocks mined: ${i}`);
};

const num = (string) => {
  return parseInt(string);
};

module.exports = { fromWei, toWei, getBlock, mine, num };
