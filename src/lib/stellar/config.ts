export const STELLAR_CONFIG = {
  network: "testnet" as const,
  networkPassphrase: "Test SDF Network ; September 2015",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  contractId: "CAOAFGPATXWJ6KKGXFYHY42Q4N75NOWSR3NH3K2DT7QR3YSMDGT5P2HO",
  wasmHash: "ba7d1753ecf002984aee4a87c80b64af6bc1a819ed27bfa98162a9b4cfd2bcaa",
  deployTxHash: "5651ec5941aa13a474230811590004065067f4d37662af3ea9918780b2924069",
  sampleRegisterTxHash: "725e126cc7998b795f328f99e9ba60d863202d06aa1166016d0cd573eadd48cf",
  sampleRightsTxHash: "30f6f7e9a1df1187d0a6c57ba86eaecebafcb4d8e2af7e12930a160930359199",
  explorerTxBaseUrl: "https://stellar.expert/explorer/testnet/tx",
  explorerContractBaseUrl: "https://stellar.expert/explorer/testnet/contract",
  stellarLabContractUrl: "https://lab.stellar.org/r/testnet/contract",
} as const;

export function getTxExplorerUrl(txHash?: string | null): string {
  if (!txHash) {
    return `${STELLAR_CONFIG.explorerTxBaseUrl}/${STELLAR_CONFIG.sampleRegisterTxHash}`;
  }
  const clean = txHash.replace(/^0x/i, "").trim();
  if (!clean || clean.startsWith("mock_") || clean.length !== 64) {
    return `${STELLAR_CONFIG.explorerContractBaseUrl}/${STELLAR_CONFIG.contractId}`;
  }
  return `${STELLAR_CONFIG.explorerTxBaseUrl}/${clean}`;
}

export function getContractExplorerUrl(
  contractId: string = STELLAR_CONFIG.contractId,
): string {
  return `${STELLAR_CONFIG.explorerContractBaseUrl}/${contractId}`;
}

export function getStellarLabUrl(
  contractId: string = STELLAR_CONFIG.contractId,
): string {
  return `${STELLAR_CONFIG.stellarLabContractUrl}/${contractId}`;
}

