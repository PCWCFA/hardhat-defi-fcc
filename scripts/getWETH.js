const { getNamedAccounts, ethers, network } = require("hardhat");
const AMOUNT = ethers.utils.parseEther("0.02");
const { networkConfig } = require("../helper-hardhat-config");

async function getWeth() {
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  // call the "deposit" function on the weth contract
  // abi & contract address
  const wethTokenAddress = networkConfig[chainId]["wethTokenAddress"];
  const iWeth = await ethers.getContractAt("IWeth", wethTokenAddress, deployer);

  const tx = await iWeth.deposit({ value: AMOUNT });
  await tx.wait(1);
  const wethBalance = await iWeth.balanceOf(deployer);
  console.log(`Got ${wethBalance.toString()}`);
}

module.exports = { getWeth, AMOUNT };
