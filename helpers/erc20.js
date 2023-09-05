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

const getERC20TotalSupply = async (contractAddress, rpcUrl, decimals) => {
  const contract = getERC20ContractWithoutSigner(contractAddress, rpcUrl);
  const totalSupply = await contract.totalSupply();
  return ethers.formatUnits(totalSupply, decimals);
};

module.exports = {
  getERC20Balance,
  getERC20TotalSupply,
  getERC20ContractWithoutSigner,
};
