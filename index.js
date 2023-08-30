const appConfig = require("./config/config");
const { getERC20Balance } = require("./helpers/erc20");

const getBridgeLiquidity = () => {
  appConfig.wrappedBridge.chains.forEach((chain) => {
    chain.tokens.forEach((token) => {
      getERC20Balance(
        token.address,
        chain.original,
        chain.rpcUrl,
        token.decimals
      ).then((res) => {
        console.log(token.name, chain.name, res);
      });
    });
  });
};

getBridgeLiquidity();
