import { Hash, HexNumber, HexString, Script, utils } from "@ckb-lumos/base";
import { GodwokenClient } from "./base/client";
import {
  privateKeyToEthAddress,
  privateKeyToLayer2ScriptHash,
} from "./base/helpers";
import { createEoaAccount } from "./modules/create-eoa-account";
import crypto from "crypto";
import { L2TransactionWithStatus } from "./base/types";

export async function run() {
  const web3Url: string = process.env.WEB3_URL!;
  const privateKey: string = process.env.PRIVATE_KEY!;

  const web3Client = new GodwokenClient(web3Url);
  const rollupTypeHash = await web3Client.getRollupTypeHash();
  const ethAccountLockHash = await web3Client.getEthAccountLockHash();

  const producerId = process.env.BLOCK_PRODUCER_ID || 0;
  const blockProducerId = "0x" + BigInt(producerId).toString(16);
  const sudtId = "0x1";
  const feeAmount: bigint = BigInt(2333);
  const feeAmountHex: HexNumber = "0x" + feeAmount.toString(16);
  console.log("fee amount:", feeAmount);

  const targetEthAddress: HexString = generateEthAddress();
  console.log("target eth address:", targetEthAddress);

  const toScript: Script = {
    code_hash: ethAccountLockHash,
    hash_type: "type",
    args: rollupTypeHash + targetEthAddress.slice(2).toLowerCase(),
  };
  const toScriptHash: Hash = utils.computeScriptHash(toScript);
  const toScriptHash160: HexString = toScriptHash.slice(0, 42);
  console.log("to script hash 160:", toScriptHash160);

  const l2Transaction = await createEoaAccount(
    web3Client,
    privateKey,
    sudtId,
    feeAmountHex,
    rollupTypeHash,
    ethAccountLockHash,
    targetEthAddress
  );

  const fromScriptHash: HexString = await privateKeyToLayer2ScriptHash(
    privateKey,
    ethAccountLockHash,
    rollupTypeHash
  );
  const fromAddress: HexString = fromScriptHash.slice(0, 42);
  console.log("from address:", fromAddress);
  const fromAccountBalanceHex: HexNumber = await web3Client.getBalance(
    fromAddress,
    sudtId
  );
  const fromAccountBalance: bigint = BigInt(fromAccountBalanceHex);

  const blockProducerScriptHash: Hash = await web3Client.getScriptHash(
    blockProducerId
  );
  const blockProducerScriptHash160: HexString = blockProducerScriptHash.slice(
    0,
    42
  );
  console.log("block producer address:", blockProducerScriptHash160);
  const blockProducerBalanceHex: HexNumber = await web3Client.getBalance(
    blockProducerScriptHash160,
    sudtId
  );
  const blockProducerBalance: bigint = BigInt(blockProducerBalanceHex);

  console.log("from account balance:", fromAccountBalance);
  console.log("block producer account balance:", blockProducerBalance);

  const l2TxHash = await web3Client.submitL2Transaction(l2Transaction);
  console.log("l2 tx hash:", l2TxHash);

  await waitForTx(web3Client, l2TxHash);

  const toId = await web3Client.getAccountIdByScriptHash(toScriptHash);
  console.log("created account id:", toId);

  const fromAccountBalanceAfterCreateHex: HexNumber =
    await web3Client.getBalance(fromAddress, sudtId);
  const blockProducerBalanceAfterCreateHex: HexNumber =
    await web3Client.getBalance(blockProducerScriptHash160, sudtId);
  const fromAccountBalanceAfterCreate: bigint = BigInt(
    fromAccountBalanceAfterCreateHex
  );
  const blockProducerBalanceAfterCreate: bigint = BigInt(
    blockProducerBalanceAfterCreateHex
  );

  console.log(
    "from account balance after create:",
    fromAccountBalanceAfterCreate
  );
  console.log(
    "block producer balance after create:",
    blockProducerBalanceAfterCreate
  );

  if (fromAccountBalance !== fromAccountBalanceAfterCreate + feeAmount) {
    throw new Error(
      "from account balance not equals to balance after create + fee"
    );
  }

  if (blockProducerBalance !== blockProducerBalanceAfterCreate - feeAmount) {
    throw new Error(
      "block producer balance not equals to balance after create - fee"
    );
  }
}

async function waitForTx(
  web3Client: GodwokenClient,
  txHash: Hash,
  timeout: number = 300,
  loopInterval = 5
) {
  let tx: L2TransactionWithStatus | undefined;
  for (let i = 0; i < timeout; i += loopInterval) {
    console.log(`waiting for create eoa account ... ${i} seconds`);

    if (!tx) {
      tx = await web3Client.getTransaction(txHash);
      // pending & committed are OK
      if (tx) {
        return;
      }
    }

    await asyncSleep(loopInterval * 1000);
  }

  throw new Error("tx not found");
}

async function asyncSleep(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

function generateEthAddress(): HexString {
  const ecdh = crypto.createECDH("secp256k1");
  ecdh.generateKeys();
  const pk = ecdh.getPrivateKey();
  const privateKey = "0x" + pk.toString("hex");
  const ethAddress = privateKeyToEthAddress(privateKey);
  return ethAddress;
}
