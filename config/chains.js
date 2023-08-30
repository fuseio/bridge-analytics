const chains = [
  {
    chainName: "Polygon",
    lzChainId: 109,
    rpc: "https://rpc-mainnet.maticvigil.com",
    chainId: 137,
  },
  {
    chainName: "Gnosis",
    lzChainId: 145,
    rpc: "https://rpc.gnosischain.com/",
    chainId: 100,
  },
  {
    chainName: "Arbitrum",
    lzChainId: 110,
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc",
  },
  {
    chainName: "Optimism",
    lzChainId: 111,
    rpc: "https://mainnet.optimism.io",
    chainId: 10,
  },
];

module.exports = chains;
