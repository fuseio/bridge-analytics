const { ethers } = require("ethers");
const WETHABI = require("../abis/WETH");

const getWETHContractWithoutSigner = (address, rpcUrl) => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(address, WETHABI, provider);
  return contract;
};

module.exports = {
  getWETHContractWithoutSigner,
};
