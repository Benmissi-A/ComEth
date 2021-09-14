/* eslint-disable space-before-function-paren */
/* eslint-disable no-undef */

const hre = require('hardhat');
const { deployed } = require('./deployed');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await hre.run('compile');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);

  // Gets the contract to be deployed
  const ComEthFactory = await hre.ethers.getContractFactory('ComEthFactory');
  const comEthFactory = await ComEthFactory.deploy(deployer.address);

  // Awaits the transaction to be completed, meaning definitely added to a bloc
  await comEthFactory.deployed();

  // Create/update deployed.json and print usefull information on the console.
  await deployed('ComEthFactory', hre.network.name, comEthFactory.address);
}

// Pattern allowing to use async/await everywhere and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
