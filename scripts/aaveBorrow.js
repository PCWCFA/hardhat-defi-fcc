const { getNamedAccounts, ethers, network } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWETH");
const { networkConfig } = require("../helper-hardhat-config");
const chainId = network.config.chainId;

async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();
  // Need the AAVE V2 ABI & address
  const lendingPool = await getLendingPool(deployer);
  console.log("lendingPool address", lendingPool.address);

  // deposit
  const wethTokenAddress = networkConfig[chainId]["wethTokenAddress"];
  await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
  console.log("Depositing...");
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
  console.log("Deposited...");

  // borrow
  // determine how much we have borrowed, how much we can borrow, and how much
  // collateral
  let { availableBorrowsETH, totalCollatthETH } = await getBorrowUserData(
    lendingPool,
    deployer
  );

  // Then figure out the amount DAI that can be borrowed
  const daiPrice = await getDAIPrice();
  const amountDaiToBorrow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
  console.log(`You can borrow ${amountDaiToBorrow} DAI`);
  const amountDaiToBorrowWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  );
  const daiTokenAddress = networkConfig[chainId]["daiTokenAddress"];
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
  await getBorrowUserData(lendingPool, deployer);

  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
  await getBorrowUserData(lendingPool, deployer);
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveERC20(daiAddress, lendingPool.address, amount, account);
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
  await repayTx.wait(1);
  console.log("Repaid");
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
  console.log("Borrowing...");
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrow,
    1,
    0,
    account
  );

  await borrowTx.wait(1);
  console.log("Borrowed");
}

async function getDAIPrice() {
  const daiEthPriceFeedAddress =
    networkConfig[chainId]["daiEthPriceFeedAddress"];
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    daiEthPriceFeedAddress
  );

  const price = (await daiEthPriceFeed.latestRoundData())[1];
  console.log(`The DAI/ETH price is ${price.toString()}`);
  return price;
}

async function getBorrowUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account);
  console.log(
    "You have ",
    parseInt(totalCollateralETH._hex.toString(16)),
    " deposited."
  );
  console.log(
    "You have ",
    parseInt(totalDebtETH._hex.toString(16)),
    " borrowed."
  );
  console.log(
    "You can borrow ",
    parseInt(availableBorrowsETH._hex.toString(16))
  );
  return { availableBorrowsETH, totalCollateralETH };
}

async function approveERC20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const erc20Token = await ethers.getContractAt(
    "IERC20",
    erc20Address,
    account
  );
  const tx = await erc20Token.approve(spenderAddress, amountToSpend);
  await tx.wait(1);
  console.log("Approved");
}

async function getLendingPool(account) {
  const ILendingPoolAddressesProviderAddress =
    networkConfig[chainId]["ILendingPoolAddressesProvider"];
  const LendingPoolAddressesProviders = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    ILendingPoolAddressesProviderAddress
  );
  const lendingPoolAddress =
    await LendingPoolAddressesProviders.getLendingPool();
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  );
  return lendingPool;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
