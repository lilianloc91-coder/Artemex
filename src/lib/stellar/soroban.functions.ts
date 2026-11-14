import { createServerFn } from "@tanstack/react-start";
import { STELLAR_CONFIG } from "./config";

export const registerWorkServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: { workId: string; hash: string; author: string }) => input)
  .handler(async ({ data }) => {
    const { registerWorkOnChain } = await import("./soroban.server");
    const res = await registerWorkOnChain(data);
    const txHash = res.transactionId || STELLAR_CONFIG.sampleRegisterTxHash;
    const timestampIso = res.data?.registered_at
      ? new Date(res.data.registered_at * 1000).toISOString()
      : new Date().toISOString();
    return {
      ...res,
      txHash,
      timestampIso,
    };
  });

export const recordRightsServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      workId: string;
      eventId: string;
      eventType: string;
      actor: string;
      recipient: string;
      terms: string;
      effectiveDate?: string | undefined;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { recordRightsOnChain } = await import("./soroban.server");
    const effectiveDate = data.effectiveDate || new Date().toISOString();
    const res = await recordRightsOnChain({
      ...data,
      effectiveDate,
    });
    const txHash = res.transactionId || STELLAR_CONFIG.sampleRightsTxHash;
    const timestampIso = res.data?.recorded_at
      ? new Date(res.data.recorded_at * 1000).toISOString()
      : effectiveDate;
    return {
      ...res,
      txHash,
      timestampIso,
    };
  });

export const verifyWorkServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      workId?: string | undefined;
      hash?: string | undefined;
      expectedHash?: string | undefined;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { getWorkFromChain, getRightsEventsFromChain, verifyWorkOnChain } =
      await import("./soroban.server");

    const targetHash = data.hash || data.expectedHash;

    if (data.workId && targetHash) {
      const verified = await verifyWorkOnChain(data.workId, targetHash);
      const work = await getWorkFromChain(data.workId);
      const events = await getRightsEventsFromChain(data.workId);
      return {
        verified: Boolean(verified.data),
        mode: verified.mode,
        contractId: STELLAR_CONFIG.contractId,
        onChainWork: work.data ?? null,
        onChainEvents: events.data ?? [],
      };
    }

    if (data.workId) {
      const work = await getWorkFromChain(data.workId);
      const events = await getRightsEventsFromChain(data.workId);
      return {
        verified: Boolean(work.data),
        mode: work.mode,
        contractId: STELLAR_CONFIG.contractId,
        onChainWork: work.data ?? null,
        onChainEvents: events.data ?? [],
      };
    }

    return {
      verified: false,
      mode: "soroban-rpc-fallback" as const,
      contractId: STELLAR_CONFIG.contractId,
      onChainWork: null,
      onChainEvents: [],
    };
  });
