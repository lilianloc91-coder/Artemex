export type BankingInput = { bank: string; account: string; clabe: string };
export type BankingHashes = { bank: string; account: string; clabe: string };

/** Salted, domain-separated hashes only. Never keep raw banking details in the catalog. */
export async function hashArtisanBanking(input: BankingInput): Promise<BankingHashes | undefined> {
  if (!input.bank.trim() && !input.account.trim() && !input.clabe.trim()) return undefined;
  const salt = crypto.randomUUID();
  const digest = async (field: keyof BankingInput) => {
    const data = new TextEncoder().encode(`${salt}:${field}:${input[field].trim()}`);
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  };
  return { bank: await digest('bank'), account: await digest('account'), clabe: await digest('clabe') };
}