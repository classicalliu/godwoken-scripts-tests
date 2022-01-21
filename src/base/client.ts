import { RPC, Reader } from "ckb-js-toolkit";
import { Hash, HexNumber, HexString } from "@ckb-lumos/base";
import {
  NormalizeL2Transaction,
  NormalizeWithdrawalRequest,
} from "./normalizers";
import {
  SerializeL2Transaction,
  SerializeWithdrawalRequest,
} from "../../schemas";
import {
  FeeConfig,
  L2Transaction,
  L2TransactionWithStatus,
  WithdrawalRequest,
} from "./types";

export class GodwokenClient {
  private rpc: RPC;

  constructor(url: string) {
    this.rpc = new RPC(url);
  }

  private async rpcCall(method_name: string, ...args: any[]): Promise<any> {
    const name = "gw_" + method_name;
    const result = await this.rpc[name](...args);
    return result;
  }

  private async polyRpcCall(method_name: string, ...args: any[]): Promise<any> {
    const name = "poly_" + method_name;
    const result = await this.rpc[name](...args);
    return result;
  }

  /**
   * Serialize withdrawal request and submit to godwoken
   *
   * @param request
   * @returns
   */
  async submitWithdrawalRequest(request: WithdrawalRequest): Promise<void> {
    const data = new Reader(
      SerializeWithdrawalRequest(NormalizeWithdrawalRequest(request))
    ).serializeJson();
    return await this.rpcCall("submit_withdrawal_request", data);
  }

  async submitL2Transaction(l2tx: L2Transaction): Promise<Hash> {
    const data = new Reader(
      SerializeL2Transaction(NormalizeL2Transaction(l2tx))
    ).serializeJson();
    return await this.rpcCall("submit_l2transaction", data);
  }

  /**
   *
   * @param scriptHash layer2 lock script hash
   * @returns uint32
   */
  async getAccountIdByScriptHash(
    scriptHash: Hash
  ): Promise<HexNumber | undefined> {
    const id = await this.rpcCall("get_account_id_by_script_hash", scriptHash);
    return id;
  }

  /**
   *
   * @param shortAddress scriptHash160 (scriptHash first 20 bytes)
   * @returns uint32
   */
  async getScriptHashByShortAddress(
    shortAddress: HexString
  ): Promise<Hash | undefined> {
    const scriptHash = await this.rpcCall(
      "get_script_hash_by_short_address",
      shortAddress
    );
    return scriptHash;
  }

  /**
   *
   * @param accountId uint32 in hex number
   * @returns uint32 in hex number
   */
  async getNonce(accountId: HexNumber): Promise<HexNumber> {
    const nonce = await this.rpcCall("get_nonce", accountId);
    return nonce;
  }

  /**
   *
   * @param accountId uint32 in hex number
   * @returns
   */
  async getScriptHash(accountId: HexNumber): Promise<Hash> {
    return await this.rpcCall("get_script_hash", accountId);
  }

  async getFeeConfig(): Promise<FeeConfig> {
    return await this.rpcCall("get_fee_config");
  }

  async getTransaction(hash: Hash): Promise<L2TransactionWithStatus> {
    return await this.rpcCall("get_transaction", hash);
  }

  async getRollupTypeHash(): Promise<Hash> {
    return await this.polyRpcCall("getRollupTypeHash");
  }

  async getEthAccountLockHash(): Promise<Hash> {
    return await this.polyRpcCall("getEthAccountLockHash");
  }

  async getBalance(address: HexString, sudtId: HexNumber): Promise<HexNumber> {
    return await this.rpcCall("get_balance", address, sudtId);
  }
}
