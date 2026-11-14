import type { Piece } from '@/lib/toltek';

// QR codes resolve the current public record, rather than claiming catalog text is on-chain.
export function piecePassportUrl(piece: Pick<Piece, 'id'>): string {
  const url = new URL('/verificar', 'https://ancestral-craft-passport.lovable.app');
  url.searchParams.set('id', piece.id);
  return url.toString();
}