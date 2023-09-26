/* eslint-disable no-await-in-loop, no-use-before-define, no-lonely-if */
/* eslint-disable no-console, no-inner-declarations, no-undef, import/no-unresolved */
const { ethers } = require('hardhat');
const path = require('path');
const fs = require('fs');
const keythereum = require('keythereum');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { deployCDKValidiumDeployer } = require('./helpers/deployment-helpers');

const pathDeployParameters = path.join(__dirname, './deploy_parameters.json');
const deployParameters = require('./deploy_parameters.json');

async function genDeployerKey() {
    let privateKey = '';
    const params = { keyBytes: 32, ivBytes: 16 };
    const dk = keythereum.create(params);
    console.log(dk.privateKey.toString('hex'));
    privateKey = dk.privateKey.toString('hex');
    // Note: if options is unspecified, the values in keythereum.constants are used.
    const options = {
        kdf: 'scrypt',
        cipher: 'aes-128-ctr',
        kdfparams: {
            c: 262144,
            dklen: 32,
            prf: 'hmac-sha256',
        },
    };
    // synchronous
    const keyObject = keythereum.dump('test', dk.privateKey, dk.salt, dk.iv, options);
    fs.writeFileSync(path.join(__dirname, './deployer.keystore'), JSON.stringify(keyObject, null, 1));
    return privateKey;
}

async function main() {
    // Load provider
    let currentProvider = ethers.provider;
    if (deployParameters.multiplierGas || deployParameters.maxFeePerGas) {
        if (process.env.HARDHAT_NETWORK !== 'hardhat') {
            currentProvider = new ethers.providers.JsonRpcProvider(`${process.env.L1_RPC}`);
            if (deployParameters.maxPriorityFeePerGas && deployParameters.maxFeePerGas) {
                console.log(`Hardcoded gas used: MaxPriority${deployParameters.maxPriorityFeePerGas} gwei, MaxFee${deployParameters.maxFeePerGas} gwei`);
                const FEE_DATA = {
                    maxFeePerGas: ethers.utils.parseUnits(deployParameters.maxFeePerGas, 'gwei'),
                    maxPriorityFeePerGas: ethers.utils.parseUnits(deployParameters.maxPriorityFeePerGas, 'gwei'),
                };
                currentProvider.getFeeData = async () => FEE_DATA;
            } else {
                console.log('Multiplier gas used: ', deployParameters.multiplierGas);
                async function overrideFeeData() {
                    const feedata = await ethers.provider.getFeeData();
                    return {
                        maxFeePerGas: feedata.maxFeePerGas.mul(deployParameters.multiplierGas).div(1000),
                        maxPriorityFeePerGas: feedata.maxPriorityFeePerGas.mul(deployParameters.multiplierGas).div(1000),
                    };
                }
                currentProvider.getFeeData = overrideFeeData;
            }
        }
    }

    let funder;
    if (deployParameters.funderPvtKey) {
        funder = new ethers.Wallet(deployParameters.funderPvtKey, currentProvider);
    }
    const deployerPvtKey = await genDeployerKey();

    // Load deployer
    let deployer;
    if (deployerPvtKey) {
        deployer = new ethers.Wallet(deployerPvtKey, currentProvider);
    }
    deployParameters.deployerPvtKey = deployerPvtKey;
    const sendTokenAmount = '1';
    const tx = {
        from: funder.address,
        to: deployer.address,
        value: ethers.utils.parseEther(sendTokenAmount),
        nonce: currentProvider.getTransactionCount(funder.address, 'latest'),
        gasLimit: ethers.utils.hexlify(100000),
        gasPrice: currentProvider.getGasPrice(),
    };

    const fundTx = await funder.sendTransaction(tx);
    const receipt = await fundTx.wait();

    if (receipt.status !== 1) {
        throw new Error('Transaction failed');
    }
    console.log('funder sendTransaction: ', fundTx.hash);

    initialCDKValidiumDeployerOwner = deployer.address;

    if (initialCDKValidiumDeployerOwner === undefined || initialCDKValidiumDeployerOwner === '') {
        throw new Error('Missing parameter: initialCDKValidiumDeployerOwner');
    }

    // Deploy CDKValidiumDeployer if is not deployed already using keyless deployment
    const [cdkValidiumDeployerContract, keylessDeployer] = await deployCDKValidiumDeployer(initialCDKValidiumDeployerOwner, deployer);
    if (keylessDeployer === ethers.constants.AddressZero) {
        console.log('#######################\n');
        console.log('cdkValidiumDeployer already deployed on: ', cdkValidiumDeployerContract.address);
    } else {
        console.log('#######################\n');
        console.log('cdkValidiumDeployer deployed on: ', cdkValidiumDeployerContract.address);
    }

    deployParameters.cdkValidiumDeployerAddress = cdkValidiumDeployerContract.address;
    deployParameters.admin = deployer.address;
    deployParameters.trustedSequencer = deployer.address;
    deployParameters.trustedAggregator = deployer.address;
    deployParameters.cdkValidiumOwner = deployer.address;
    deployParameters.initialCDKValidiumDeployerOwner = deployer.address;
    deployParameters.timelockAddress = deployer.address;

    let hardhatConf = '';
    let key = '"';
    key += deployerPvtKey;
    key += '"';
    fs.readFile(path.join(__dirname,"../hardhat.config.js"), 'utf8', function (err,data) {
        if (err) {
          return console.log(err);
        }
        hardhatConf = data
        hardhatConf = hardhatConf.replace(/process.env.PRIVATE_KEY_DEPLOYER/g, key)
        fs.writeFileSync(path.join(__dirname, '../hardhat.config.js'), hardhatConf);
        console.log("hardhatConf writed",hardhatConf.length);
      });

    fs.writeFileSync(pathDeployParameters, JSON.stringify(deployParameters, null, 1));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
