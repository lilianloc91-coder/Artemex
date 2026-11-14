import { PassportQrCode } from '@/components/toltek/PassportQrCode';
import { Link } from '@tanstack/react-router';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { piecePassportUrl } from '@/lib/piece-passport';
import { contractId, shortHash, type Piece } from '@/lib/toltek';

export function PiecePassportQr({ piece, compact = false }: { piece: Piece; compact?: boolean }) {
  const { t } = useI18n();
  return <section aria-label={`${t('Pasaporte Stellar')} · ${piece.id}`} className="flex items-start gap-4 border-t border-border py-4">
    <Link to="/verificar" search={{ id: piece.id }} aria-label={`${t('Consultar pasaporte')} · ${piece.id}`} className="shrink-0 rounded-md focus-visible:outline-ring">
      <PassportQrCode value={piecePassportUrl(piece)} size={compact ? 100 : 152} title={`${t('Código QR del pasaporte')} · ${piece.id}`} />
    </Link>
    <div className="min-w-0 flex-1 space-y-1 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-jade" />{t('Pasaporte Stellar')}</p>
      <p className="font-mono text-muted-foreground">{piece.id}</p>
      <p className="text-muted-foreground">{piece.community} · {piece.region}</p>
      <p className="text-muted-foreground">{t(piece.technique)}</p>
      <p className="text-muted-foreground">{t('Soroban Testnet · Datos de catálogo')}</p>
      {compact && <p className="break-all font-mono text-muted-foreground">{piece.stellarTxHash ? shortHash(piece.stellarTxHash, 6) : t('Sin transacción registrada')}</p>}
      {!compact && <dl className="space-y-2 pt-2">
        <div><dt className="text-muted-foreground">{t('Artesana(o)')}</dt><dd>{piece.artisan}</dd></div>
        <div><dt className="text-muted-foreground">{t('Transacción Stellar')}</dt><dd className="break-all font-mono">{piece.stellarTxHash || t('Sin transacción registrada')}</dd></div>
        <div><dt className="text-muted-foreground">{t('Contrato Soroban')}</dt><dd className="break-all font-mono">{shortHash(contractId, 10)}</dd></div>
      </dl>}
      <Button asChild variant="link" size="sm" className="h-auto justify-start whitespace-normal px-0 py-1 text-xs"><Link to="/verificar" search={{ id: piece.id }}>{t('Consultar pasaporte')}<ExternalLink className="h-3 w-3 shrink-0" /></Link></Button>
    </div>
  </section>;
}