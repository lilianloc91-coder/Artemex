import { describe, expect, it } from 'vitest';
import { piecePassportUrl } from '@/lib/piece-passport';
import { pieces } from '@/lib/toltek';

describe('piece passport QR destination', () => {
  it('attributes Tecuani to its supplied artisan author', () => {
    expect(pieces.find(piece => piece.id === 'TK-0512')?.artisan).toBe('Angel Cordero Sosa');
  });
  it('uses the Tecuani reference price and retains certificate and shipping line items', () => {
    const piece = pieces.find(piece => piece.id === 'TK-0512');
    if (!piece) throw new Error('Missing Tecuani');
    expect(piece.priceMxn).toBe(450);
    expect(piece.certFeeMxn).toBe(0);
    expect(piece.shippingMxn).toBe(0);
    expect(piece.priceMxn + (piece.certFeeMxn ?? 0) + (piece.shippingMxn ?? 0)).toBe(450);
  });
  it('resolves every craft to its own public record', () => {
    for (const piece of pieces) {
      const url = new URL(piecePassportUrl(piece));
      expect(url.origin).toBe('https://ancestral-craft-passport.lovable.app');
      expect(url.pathname).toBe('/verificar');
      expect(url.searchParams.get('id')).toBe(piece.id);
    }
    expect(new Set(pieces.map(piecePassportUrl)).size).toBe(pieces.length);
  });
});