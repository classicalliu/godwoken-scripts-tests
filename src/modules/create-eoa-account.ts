import { Hash, HexNumber, HexString, Script, utils } from "@ckb-lumos/base";
import { GodwokenClient } from "../base/client";
import { signMessage, privateKeyToAccountId } from "../base/helpers";
import { L2Transaction, RawL2Transaction } from "../base/types";
import {
  NormalizeCreateAccount,
  NormalizeRawL2Transaction,
} from "../base/normalizers";
import { Reader } from "ckb-js-toolkit";
import {
  SerializeCreateAccount,
  SerializeRawL2Transaction,
} from "../../schemas";
import keccak256 from "keccak256";

export async function createEoaAccount(
  godwokenClient: GodwokenClient,
  privateKey: HexString,
  sudtId: HexNumber,
  feeAmount: HexNumber,
  rollupTypeHash: Hash,
  ethAccountTypeHash: Hash,
  ethAddress: HexString
): Promise<L2Transaction> {
  const fromId: HexNumber | undefined = await privateKeyToAccountId(
    godwokenClient,
    privateKey,
    ethAccountTypeHash,
    rollupTypeHash
  )!;
  if (!fromId) {
    console.error("Account id of provided private key not found!");
    process.exit(-1);
  }
  console.log("Your from id:", +fromId);

  const nonce = await godwokenClient.getNonce(fromId);

  const l2Script: Script = {
    code_hash: ethAccountTypeHash,
    hash_type: "type",
    args: rollupTypeHash + ethAddress.slice(2).toLowerCase(),
  };

  const rawL2Tx = createAccountRawL2Transaction(
    fromId,
    nonce,
    l2Script,
    sudtId,
    feeAmount
  );

  const senderScriptHash = await godwokenClient.getScriptHash(fromId);
  const receiverScriptHash = await godwokenClient.getScriptHash("0x0");

  const message = generateTransactionMessage(
    rawL2Tx,
    senderScriptHash,
    receiverScriptHash,
    rollupTypeHash
  );

  const signature = signMessage(message, privateKey);

  const l2tx: L2Transaction = { raw: rawL2Tx, signature };
  // console.log("l2 tx:", JSON.stringify(l2tx, null, 2));

  return l2tx;
}

function createAccountRawL2Transaction(
  fromId: HexNumber,
  nonce: HexNumber,
  script: Script,
  sudtId: HexNumber,
  feeAmount: HexNumber
): RawL2Transaction {
  const createAccount = {
    script,
    fee: {
      sudt_id: sudtId,
      amount: feeAmount,
    },
  };
  // Serialize MetaContractArgs, https://github.com/nervosnetwork/godwoken/blob/v0.9.0-rc3/crates/types/schemas/godwoken.mol#L224
  const enumTag = "0x00000000";
  const createAccountPart = new Reader(
    SerializeCreateAccount(NormalizeCreateAccount(createAccount))
  ).serializeJson();
  const args = enumTag + createAccountPart.slice(2);

  // to_id = 0, means MetaContract
  return {
    from_id: fromId,
    to_id: "0x0",
    nonce,
    args,
  };
}

export function generateTransactionMessage(
  rawL2Transaction: RawL2Transaction,
  senderScriptHash: Hash,
  receiverScriptHash: Hash,
  rollupTypeHash: Hash
): HexString {
  const rawTxHex = new Reader(
    SerializeRawL2Transaction(NormalizeRawL2Transaction(rawL2Transaction))
  ).serializeJson();

  const data =
    rollupTypeHash +
    senderScriptHash.slice(2) +
    receiverScriptHash.slice(2) +
    rawTxHex.slice(2);
  const message = new utils.CKBHasher().update(data).digestHex();

  const prefix = Buffer.from(`\x19Ethereum Signed Message:\n32`);
  const buf = Buffer.concat([prefix, Buffer.from(message.slice(2), "hex")]);
  return `0x${keccak256(buf).toString("hex")}`;
}
