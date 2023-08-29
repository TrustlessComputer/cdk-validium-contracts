/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const ethers = require('ethers');
require('dotenv').config();

const deployOutput = require('/shared/deploy_output.json');
const dataCommitteeContractJson = require('/cdk-validium-contracts/compiled-contracts/CDKDataCommittee.json');

const DEFAULT_DEPLOYER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const DEFAULT_DAC_ADDRESS = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';

async function main() {
    const dataCommitteeContractAddress = deployOutput["cdkDataCommitteeContract"];
    if (dataCommitteeContractAddress === undefined || dataCommitteeContractAddress === '') {
        throw new Error(`Missing DataCommitteeContract: ${deployOutput}`);
    }    
    const dataCommitteeUrl = process.env.DAC_URL || 'http://127.0.0.1:8444';
    console.log('DAC_URL:', dataCommitteeUrl);
    const dataCommitteeAddress = process.env.DAC_ADDRESS || DEFAULT_DAC_ADDRESS;
    console.log('DAC_ADDRESS:', dataCommitteeAddress);
    const JSONRPC_HTTP_URL = process.env.JSONRPC_HTTP_URL || 'http://127.0.0.1:8545'
    console.log('JSONRPC_HTTP_URL:', JSONRPC_HTTP_URL);
    const currentProvider = new ethers.providers.JsonRpcProvider(JSONRPC_HTTP_URL);
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || DEFAULT_DEPLOYER_PRIVATE_KEY;
    // Load deployer
    const deployer = new ethers.Wallet(privateKey, currentProvider);
    console.log('Using pvtKey deployer with address: ', deployer.address);

    const requiredAmountOfSignatures = 1;
    const urls = [dataCommitteeUrl];
    const addrsBytes = dataCommitteeAddress;
    const dataCommitteeContract = new ethers.Contract(dataCommitteeContractAddress, dataCommitteeContractJson.abi, deployer);
    const tx = await dataCommitteeContract.setupCommittee(requiredAmountOfSignatures, urls, addrsBytes);
    console.log(`Committee seted up with ${dataCommitteeAddress}`);
    console.log('Transaction hash:', tx.hash);
    // Wait for receipt
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    const actualAmountOfmembers = await dataCommitteeContract.getAmountOfMembers();
    expect(actualAmountOfmembers.toNumber()).to.be.equal(urls.length);
    
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
