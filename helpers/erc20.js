const { ethers } = require("ethers");
const ERC20ABI = require("../abis/ERC20");

const getERC20ContractWithoutSigner = (address, rpcUrl) => {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(address, ERC20ABI, provider);
  return contract;
};

const getERC20Balance = async (contractAddress, address, rpcUrl, decimals) => {
  const contract = getERC20ContractWithoutSigner(contractAddress, rpcUrl);
  const balance = await contract.balanceOf(address);
  return ethers.formatUnits(balance, decimals);
};

module.exports = { getERC20Balance };
