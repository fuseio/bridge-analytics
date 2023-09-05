const { ethers, formatUnits } = require("ethers");
const appConfig = require("./config/config");
const blocks = require("./config/blocks.json");
const fs = require("fs");
const {
  getERC20Balance,
  getERC20TotalSupply,
  getERC20ContractWithoutSigner,
} = require("./helpers/erc20");
const {
  BigQuery,
  BigQueryDate,
  BigQueryDatetime,
} = require("@google-cloud/bigquery");
const { getWETHContractWithoutSigner } = require("./helpers/weth");
const bigquery = new BigQuery({
  projectId: "fuse-etl-372416",
});

async function insertRowsAsStream(
  rows,
  datasetId = "fuse_bridge_analytics",
  tableId = "my_table"
) {
  //console.log(rows);
  await bigquery.dataset(datasetId).table(tableId).insert(rows);
  // console.log(`Inserted ${rows.length} rows`);
}

const getBridgeLiquidity = (date) => {
  appConfig.wrappedBridge.chains.forEach(async (chain) => {
    chain.tokens.forEach(async (token) => {
      if (token.isNative && token.isBridged) {
        let res = await getERC20TotalSupply(
          token.address,
          chain.rpcUrl,
          token.decimals
        );
        insertRowsAsStream(
          [
            {
              token: token.symbol,
              source_chain: "Fuse",
              dest_chain: chain.name,
              liquidity: res,
              date: date,
            },
          ],
          "fuse_bridge_analytics",
          "liquidity"
        );
      } else if (!token.isNative && !token.isBridged) {
        let res = await getERC20Balance(
          token.address,
          chain.original,
          chain.rpcUrl,
          token.decimals
        );
        insertRowsAsStream(
          [
            {
              token: token.symbol,
              source_chain: chain.name,
              dest_chain: "Fuse",
              liquidity: res,
              date: date,
            },
          ],
          "fuse_bridge_analytics",
          "liquidity"
        );
      }
    });
  });
};

const getNumberOfTransactionsPerBridge = () => {
  let newBlocks = JSON.parse(JSON.stringify(blocks));
  appConfig.wrappedBridge.chains.forEach(async (chain) => {
    chain.tokens.forEach(async (token) => {
      try {
        if (token.isNative && token.isBridged) {
          const originalContract = getWETHContractWithoutSigner(
            "0x0BE9e53fd7EDaC9F859882AfdDa116645287C629",
            "https://rpc.fuse.io"
          );
          const recieveFilter = originalContract.filters.Withdrawal(
            chain.originalFuse,
            null
          );
          const sendFilter = originalContract.filters.Deposit(
            chain.originalFuse,
            null
          );
          const provider = new ethers.JsonRpcProvider("https://rpc.fuse.io");
          const recieveTopics = await recieveFilter.getTopicFilter();
          const receiveLogs = await provider.getLogs({
            address: "0x0BE9e53fd7EDaC9F859882AfdDa116645287C629",
            fromBlock: blocks["Fuse"],
            toBlock: "latest",
            topics: recieveTopics,
          });
          const sendTopics = await sendFilter.getTopicFilter();
          const sendLogs = await provider.getLogs({
            address: "0x0BE9e53fd7EDaC9F859882AfdDa116645287C629",
            fromBlock: blocks["Fuse"],
            toBlock: "latest",
            topics: sendTopics,
          });
          sendLogs.forEach(async (log) => {
            provider.getBlock(log.blockNumber).then((block) => {
              insertRowsAsStream(
                [
                  {
                    hash: log.transactionHash,
                    source_chain: "Fuse",
                    dest_chain: chain.name,
                    date: new BigQueryDatetime({
                      day: new Date(block.timestamp * 1000).getDate(),
                      month: new Date(block.timestamp * 1000).getMonth() + 1,
                      year: new Date(block.timestamp * 1000).getFullYear(),
                      hours: new Date(block.timestamp * 1000).getHours(),
                      minutes: new Date(block.timestamp * 1000).getMinutes(),
                      seconds: new Date(block.timestamp * 1000).getSeconds(),
                    }),
                    block: log.blockNumber,
                    token: token.symbol,
                    value: formatUnits(BigInt(log.data, 16), token.decimals),
                  },
                ],
                "fuse_bridge_analytics",
                "transactions"
              );
              newBlocks["Fuse"] = Math.max(
                newBlocks["Fuse"],
                log.blockNumber + 1
              );
              fs.writeFile(
                "./config/blocks.json",
                JSON.stringify(newBlocks),
                (err) => {
                  if (err) {
                    console.log(err);
                  }
                }
              );
            });
          });
          receiveLogs.forEach(async (log) => {
            provider.getBlock(log.blockNumber).then((block) => {
              insertRowsAsStream(
                [
                  {
                    hash: log.transactionHash,
                    source_chain: chain.name,
                    dest_chain: "Fuse",
                    date: new BigQueryDatetime({
                      day: new Date(block.timestamp * 1000).getDate(),
                      month: new Date(block.timestamp * 1000).getMonth() + 1,
                      year: new Date(block.timestamp * 1000).getFullYear(),
                      hours: new Date(block.timestamp * 1000).getHours(),
                      minutes: new Date(block.timestamp * 1000).getMinutes(),
                      seconds: new Date(block.timestamp * 1000).getSeconds(),
                    }),
                    block: log.blockNumber,
                    token: token.symbol,
                    value: formatUnits(BigInt(log.data), token.decimals),
                  },
                ],
                "fuse_bridge_analytics",
                "transactions"
              );
              newBlocks["Fuse"] = Math.max(
                newBlocks["Fuse"],
                log.blockNumber + 1
              );
              fs.writeFile(
                "./config/blocks.json",
                JSON.stringify(newBlocks),
                (err) => {
                  if (err) {
                    console.log(err);
                  }
                }
              );
            });
          });
        } else if (!token.isNative && !token.isBridged) {
          const originalContract = getERC20ContractWithoutSigner(
            token.address,
            chain.rpcUrl
          );
          const sendFilter = originalContract.filters.Transfer(
            chain.original,
            null,
            null
          );
          const receiveFilter = originalContract.filters.Transfer(
            null,
            chain.original,
            null
          );
          const sendTopics = await sendFilter.getTopicFilter();
          const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
          const sendLogs = await provider.getLogs({
            address: token.address,
            fromBlock: blocks[chain.name],
            toBlock: "latest",
            topics: sendTopics,
          });
          const receiveTopics = await receiveFilter.getTopicFilter();
          const receiveLogs = await provider.getLogs({
            address: token.address,
            fromBlock: blocks[chain.name],
            toBlock: "latest",
            topics: receiveTopics,
          });
          sendLogs.forEach(async (log) => {
            provider.getBlock(log.blockNumber).then((block) => {
              insertRowsAsStream(
                [
                  {
                    hash: log.transactionHash,
                    source_chain: "Fuse",
                    dest_chain: chain.name,
                    date: new BigQueryDatetime({
                      day: new Date(block.timestamp * 1000).getDate(),
                      month: new Date(block.timestamp * 1000).getMonth() + 1,
                      year: new Date(block.timestamp * 1000).getFullYear(),
                      hours: new Date(block.timestamp * 1000).getHours(),
                      minutes: new Date(block.timestamp * 1000).getMinutes(),
                      seconds: new Date(block.timestamp * 1000).getSeconds(),
                    }),
                    block: log.blockNumber,
                    token: token.symbol,
                    value: formatUnits(BigInt(log.data, 16), token.decimals),
                  },
                ],
                "fuse_bridge_analytics",
                "transactions"
              );
              newBlocks[chain.name] = Math.max(
                newBlocks[chain.name],
                log.blockNumber + 1
              );
              fs.writeFile(
                "./config/blocks.json",
                JSON.stringify(newBlocks),
                (err) => {
                  if (err) {
                    console.log(err);
                  }
                }
              );
            });
          });
          receiveLogs.forEach(async (log) => {
            provider.getBlock(log.blockNumber).then((block) => {
              insertRowsAsStream(
                [
                  {
                    hash: log.transactionHash,
                    source_chain: chain.name,
                    dest_chain: "Fuse",
                    date: new BigQueryDatetime({
                      day: new Date(block.timestamp * 1000).getDate(),
                      month: new Date(block.timestamp * 1000).getMonth() + 1,
                      year: new Date(block.timestamp * 1000).getFullYear(),
                      hours: new Date(block.timestamp * 1000).getHours(),
                      minutes: new Date(block.timestamp * 1000).getMinutes(),
                      seconds: new Date(block.timestamp * 1000).getSeconds(),
                    }),
                    block: log.blockNumber,
                    token: token.symbol,
                    value: formatUnits(BigInt(log.data), token.decimals),
                  },
                ],
                "fuse_bridge_analytics",
                "transactions"
              );
              newBlocks[chain.name] = Math.max(
                newBlocks[chain.name],
                log.blockNumber + 1
              );
              fs.writeFile(
                "./config/blocks.json",
                JSON.stringify(newBlocks),
                (err) => {
                  if (err) {
                    console.log(err);
                  }
                }
              );
            });
          });
        }
      } catch (e) {
        console.log(e, chain.name, token.symbol);
      }
    });
  });
};

async function main() {
  const date = new BigQueryDate({
    day: new Date().getDate(),
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  getBridgeLiquidity(date);
  getNumberOfTransactionsPerBridge();
}

main();
