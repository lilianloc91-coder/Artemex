import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hashArtisanBanking } from '@/lib/artisan-banking';
beforeAll(() => vi.stubGlobal('crypto', webcrypto));
describe('private banking hashes', () => {
 it('hashes Banco, Cuenta and CLABE without retaining clear values', async () => {
  const input = { bank: 'Banco de prueba', account: '1234567890', clabe: '012345678901234567' };
  const output = await hashArtisanBanking(input);
  expect(output).toBeDefined();
  for (const field of ['bank', 'account', 'clabe'] as const) {
   expect(output?.[field]).toMatch(/^[a-f0-9]{64}$/);
   expect(output?.[field]).not.toContain(input[field]);
  }
 });
 it('uses a different salt for repeated details', async () => {
  const input = { bank: 'Banco de prueba', account: '1234567890', clabe: '012345678901234567' };
  expect(await hashArtisanBanking(input)).not.toEqual(await hashArtisanBanking(input));
 });
 it('leaves missing banking data empty', async () => {
  expect(await hashArtisanBanking({ bank: '', account: '', clabe: '' })).toBeUndefined();
 });
});
