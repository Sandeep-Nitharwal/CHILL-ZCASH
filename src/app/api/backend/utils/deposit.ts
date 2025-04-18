/// Taken from defuse-sdk, will be removed once a proper SDK will be released
/// https://github.com/defuse-protocol/defuse-sdk/blob/main/src/services/depositService.ts

import { base64 } from "@scure/base"
import { settings } from "./environment"
import { FetchError, ResponseError, type GetNearNep141StorageBalanceBoundsRequest, type GetNearNep141StorageBalanceBoundsResponse, type GetNearNep141StorageBalanceOfRequest, type GetNearNep141StorageBalanceOfResponse, type JSONRPCRequest, type Transaction } from "../types/deposit"
import  * as near from "near-api-js"
import { AccessKeyView, CodeResult } from "near-api-js/lib/providers/provider"
import { Near, transactions } from "near-api-js"
import { PublicKey } from "near-api-js/lib/utils"
import { getDefuseAssetId, SingleChainToken, UnifiedToken } from "../types/tokens"
export const FT_DEPOSIT_GAS = `30${"0".repeat(12)}` // 30 TGAS
export const FT_TRANSFER_GAS = `50${"0".repeat(12)}` // 30 TGAS
const BASE_URL = "https://nearrpc.aurora.dev"

/**
 * Creates a deposit transaction for NEAR.
 *
 * @param receiverId - The address of the Defuse protocol.
 * @param assetId - The address of the asset being deposited.
 * @param amount - The amount to deposit.
 * @returns An array containing the transaction object.
 *
 * @remarks
 * The `args` object in the returned transaction can be customized:
 * - If `msg` is empty, the asset will be deposited to the caller's address.
 * - To create an intent after deposit, `msg` should be a JSON string with the following structure:
 *   {
 *     "receiver_id": "receiver.near", // required
 *     "execute_intents": [...], // signed intents, optional
 *     "refund_if_failed": true // optional, default: false
 *   }
 */
export function createBatchDepositNearNep141Transaction(
  assetAccountId: string,
  amount: bigint,
  isStorageDepositRequired: boolean,
  minStorageBalance: bigint
): Transaction["NEAR"][] {

  return [
    {
      receiverId: assetAccountId,
      actions: [
        ...(isStorageDepositRequired
          ? [
              transactions.functionCall(
                "storage_deposit",
                {
                  account_id: settings.defuseContractId || "intents.near",
                  registration_only: true,
                },
                BigInt(FT_DEPOSIT_GAS),
                minStorageBalance
              ),
            ]
          : []),
        transactions.functionCall(
          "ft_transfer_call",
          {
            receiver_id: settings.defuseContractId || "intents.near",
            amount: amount.toString(),
            msg: "",
          },
          BigInt(FT_TRANSFER_GAS),
          BigInt(1)
        ),
      ],
    },
  ]
}

export const getNearNep141MinStorageBalance = async ({
    contractId,
  }: {
    contractId: string
  }): Promise<bigint> => {
    const response = await getNearNep141StorageBalanceBounds({
      request_type: "call_function",
      method_name: "storage_balance_bounds",
      account_id: contractId,
      args_base64: base64.encode(new TextEncoder().encode(JSON.stringify({}))),
      finality: "optimistic",
    })
  
    const uint8Array = new Uint8Array(response.result)
    const decoder = new TextDecoder()
    const parsed = JSON.parse(decoder.decode(uint8Array))
    return BigInt(parsed.min)
  }

export function createBatchDepositNearNativeTransaction(
  assetAccountId: string,
  amount: bigint,
  isStorageDepositRequired: boolean,
  minStorageBalance: bigint,
  isWrapNearRequired: boolean,
  wrapAmount: bigint
): Transaction["NEAR"][] {
  return [
    {
      receiverId: assetAccountId,
      actions: [
        ...(isWrapNearRequired || isStorageDepositRequired
          ? [
              transactions.functionCall(
                "near_deposit",
                {},
                BigInt(FT_DEPOSIT_GAS),
                BigInt(wrapAmount + minStorageBalance)
              ),
            ]
          : []),
        transactions.functionCall(
          "ft_transfer_call",
          {
            receiver_id: settings.defuseContractId || "intents.near",
            amount: amount.toString(),
            msg: "",
          },
          BigInt(FT_TRANSFER_GAS),
          BigInt(1)
        ),
      ],
    },
  ]
}

export type TokenBalances = {
    [key in string]?: bigint
}

export async function getDepositedBalances(
    accountId: string,
    tokens: (UnifiedToken | SingleChainToken)[],
    nearClient: near.providers.Provider,
    network?: string
  ): Promise<TokenBalances> {
    // RPC call
    // Warning: `CodeResult` is not correct type for `call_function`, but it's closest we have.
    const networkId = network || "near";
    // Check if the token is of certain type
    const defuseAssetIds = tokens.map(token => getDefuseAssetId(token, networkId));
    // console.log("defuseAssetIds", defuseAssetIds);
    const output = await nearClient.query<CodeResult>({
      request_type: "call_function",
      account_id: settings.defuseContractId || "intents.near",
      method_name: "mt_batch_balance_of",
      args_base64: btoa(
        JSON.stringify({
          account_id: accountId,
          token_ids: defuseAssetIds,
        })
      ),
      finality: "optimistic",
    })

    // Decoding response
    const uint8Array = new Uint8Array(output.result)
    const decoder = new TextDecoder()
    const parsed = JSON.parse(decoder.decode(uint8Array))

    // Validating response
    assert(
      Array.isArray(parsed) && parsed.every((a) => typeof a === "string"),
      "Invalid response"
    )
    assert(parsed.length === defuseAssetIds.length, "Invalid response")


    // Transforming response
    const result: TokenBalances = {}
    for (let i = 0; i < defuseAssetIds.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: always within bounds
      result[defuseAssetIds[i]!] = BigInt(parsed[i])
    }

    return result
  }

  export async function getBalancesList(
    accountId: string,
    defuseAssetIds: any[],
    nearClient: near.providers.Provider,
  ): Promise<any> {
    // RPC call
    // Warning: `CodeResult` is not correct type for `call_function`, but it's closest we have.
    // Check if the token is of certain type
    // console.log("defuseAssetIds", defuseAssetIds);
    const output = await nearClient.query<CodeResult>({
      request_type: "call_function",
      account_id: settings.defuseContractId || "intents.near",
      method_name: "mt_batch_balance_of",
      args_base64: btoa(
        JSON.stringify({
          account_id: accountId,
          token_ids: defuseAssetIds,
        })
      ),
      finality: "optimistic",
    })

    // Decoding response
    const uint8Array = new Uint8Array(output.result)
    const decoder = new TextDecoder()
    const parsed = JSON.parse(decoder.decode(uint8Array))

    // Validating response
    assert(
      Array.isArray(parsed) && parsed.every((a) => typeof a === "string"),
      "Invalid response"
    )
    assert(parsed.length === defuseAssetIds.length, "Invalid response")


    // Transforming response
    const result:any = [];
    for (let i = 0; i < defuseAssetIds.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: always within bounds
      result.push(parsed[i]);
    }

    return result
  }

  export function assert(condition: unknown, msg?: string): asserts condition {
    if (!condition) {
      throw new Error(msg)
    }
  }

  export async function getNearNep141StorageBalanceOf(
    params: GetNearNep141StorageBalanceOfRequest["params"][0]
  ): Promise<GetNearNep141StorageBalanceOfResponse["result"]> {
    const json = await jsonRPCRequest<GetNearNep141StorageBalanceOfRequest>(
      "query",
      params
    )
    return json.result
  }

  export async function getNearNep141StorageBalanceBounds(
    params: GetNearNep141StorageBalanceBoundsRequest["params"][0]
  ): Promise<GetNearNep141StorageBalanceBoundsResponse["result"]> {
    const json =
      await jsonRPCRequest<GetNearNep141StorageBalanceBoundsRequest>(
        "query",
        params
      )
    return json.result
  }

  export async function jsonRPCRequest<
  T extends JSONRPCRequest<unknown, unknown>,
>(method: T["method"], params: T["params"][0]) {
  const response = await request(`${BASE_URL}`, {
    id: "dontcare",
    jsonrpc: "2.0",
    method,
    params: params !== undefined ? params : undefined,
  })
  return response.json()
}

async function request(url: string, body: unknown): Promise<Response> {
    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw new FetchError(`The request failed ${err}`)
    }

    if (response.ok) {
      return response
    }

    throw new ResponseError(response, "Response returned an error code")
  }

  export const getNearNep141StorageBalance = async ({
    contractId,
    accountId,
  }: {
    contractId: string
    accountId: string
  }): Promise<bigint> => {
    try {
      const args = { account_id: accountId }
      const argsBase64 = Buffer.from(JSON.stringify(args)).toString("base64")

      const response = await getNearNep141StorageBalanceOf({
        request_type: "call_function",
        method_name: "storage_balance_of",
        account_id: contractId,
        args_base64: argsBase64,
        finality: "optimistic",
      })

      // console.log(response);


      const uint8Array = new Uint8Array(response.result);
      const decoder = new TextDecoder();

      const parsed = JSON.parse(decoder.decode(uint8Array));
      
      // console.log(parsed);
      
      return BigInt(parsed?.total || "0")
    } catch (err: unknown) {
      // console.error("Error fetching balance:", err);
      throw new Error(`Error fetching balance: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  export async function sendNearTransaction(nearClient: Near, sender: string, publicKey: PublicKey, receiver: string, nearTransaction: Transaction["NEAR"]): Promise<string> {

    const block = await nearClient.connection.provider.block({
        finality: 'final'
    });
    const accessKeyResponse: AccessKeyView = await nearClient.connection.provider.query({
        request_type: "view_access_key",
        finality: "final",
        account_id: sender,
        public_key: publicKey.toString(),
      });

    const recentBlockHash = near.utils.serialize.base_decode(
        block.header.hash
      );

  const transaction = transactions.createTransaction(
    sender,
    publicKey,
    nearTransaction.receiverId,
    BigInt(accessKeyResponse.nonce) + BigInt(1),
    nearTransaction.actions,
    recentBlockHash
  );
  try {
    const signedTransaction = await near.transactions.signTransaction(transaction, nearClient.connection.signer, sender, nearClient.connection.networkId);
    // send the signed transaction
    const result = await nearClient.connection.provider.sendTransaction(signedTransaction[1]);
    if(result && result.transaction && result.transaction.hash){
      console.log("Transaction result:", result.transaction.hash);
      return result.transaction.hash;
    }
    else{
      console.log("Transaction result: Failed");
      return "";
    }
    // console.log("Transaction status:", result.status);
  } catch (err) {
    throw new Error(`${err}`);
  }
  }