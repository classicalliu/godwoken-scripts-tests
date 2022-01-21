import { Hash, HexNumber, HexString, Script } from "@ckb-lumos/base";

export type U32 = number;
export type U64 = bigint;
export type U128 = bigint;

export type HexU32 = HexNumber;
export type HexU64 = HexNumber;
export type HexU128 = HexNumber;

// null means `pending`
export type BlockParameter = U64 | null;

export interface LogItem {
  account_id: HexU32;
  // The actual type is `u8`
  service_flag: HexU32;
  data: HexString;
}

export interface RunResult {
  return_data: HexString;
  logs: LogItem[];
}

export interface RawL2Transaction {
  from_id: HexU32;
  to_id: HexU32;
  nonce: HexU32;
  args: HexString;
}

export interface L2Transaction {
  raw: RawL2Transaction;
  signature: HexString;
}

export interface L2TransactionWithStatus {
  transaction: L2Transaction;
  status: "committed" | "pending";
}

export interface L2TransactionReceipt {
  tx_witness_hash: Hash;
  post_state: AccountMerkleState;
  read_data_hashes: Hash[];
  logs: LogItem[];
}

export interface AccountMerkleState {
  merkle_root: Hash;
  count: HexU32;
}

export interface Fee {
  sudt_id: HexNumber;
  amount: HexNumber;
}

export interface CreateAccount {
  script: Script;
  fee: Fee;
}

export interface SUDTFeeConfig {
  // uint32
  sudt_id: HexNumber;
  // uint64
  fee_rate_weight: HexNumber;
}

export interface FeeConfig {
  meta_cycles_limit: HexNumber;
  sudt_cycles_limit: HexNumber;
  withdraw_cycles_limit: HexNumber;
  sudt_fee_rate_weight: SUDTFeeConfig[];
}

export interface RawWithdrawalRequest {
  nonce: HexNumber;
  // CKB amount
  capacity: HexNumber;
  // SUDT amount
  amount: HexNumber;
  sudt_script_hash: Hash;
  // layer2 account_script_hash
  account_script_hash: Hash;
  // buyer can pay sell_amount and sell_capacity to unlock
  sell_amount: HexNumber;
  sell_capacity: HexNumber;
  // layer1 lock to withdraw after challenge period
  owner_lock_hash: Hash;
  // layer1 lock to receive the payment, must exists on the chain
  payment_lock_hash: Hash;
  fee: Fee;
}

export interface WithdrawalRequest {
  raw: RawWithdrawalRequest;
  signature: HexString;
}
