import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieceCard } from '@/components/toltek/ui';
import { getRegion, regionWorks } from '@/lib/regions';
import { useI18n } from '@/i18n';

export const Route = createFileRoute('/regiones/$region')({
  beforeLoad: ({ params }) => { if (!getRegion(params.region)) throw notFound(); },
  head: ({ params }) => {
    const region = getRegion(params.region);
    const title = `${region?.name ?? 'Región no encontrada'} — Arte & Origen | Tlamatik`;
    const description = region?.description ?? 'Explora las comunidades del catálogo cultural Tlamatik.';
    return { meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
  }, component: RegionMicrosite,
});
function RegionMicrosite() {
  const { region: id } = Route.useParams();
  const { t } = useI18n();
  const region = getRegion(id);
  if (!region) return null;
  const works = regionWorks(region);
  return <main>
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6"><Button asChild variant="ghost" size="sm"><Link to="/regiones"><ArrowLeft />{t('Volver al mapa')}</Link></Button></div>
    <section className="relative isolate min-h-[350px] bg-indigo text-indigo-foreground sm:min-h-[400px]">
      <img src={region.image} alt={region.name} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-linear-to-r from-indigo/85 via-indigo/55 to-indigo/10" />
      <div className="relative mx-auto flex min-h-[350px] max-w-7xl items-center px-4 py-10 sm:min-h-[400px] sm:px-6">
        <div className="max-w-2xl"><p className="mb-3 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" />{region.state} · México</p><h1 className="text-3xl leading-tight sm:text-4xl lg:text-5xl">{region.name}</h1><p className="mt-3 text-lg">{t(region.area)}</p><p className="mt-5 max-w-xl text-sm leading-relaxed">{t(region.description)}</p></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><h2 className="text-2xl">{t('Obras de la región')}</h2><p className="text-xs text-muted-foreground">{t('{{count}} obras', { count: works.length })}</p></div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{works.map((piece, index) => <PieceCard key={piece.id} piece={piece} index={index} />)}</div>
    </section>
    <section className="mx-auto grid max-w-7xl gap-8 border-t border-border px-4 py-8 sm:grid-cols-2 sm:px-6">
      <div><h2 className="mb-4 text-2xl">{t('Comunidades y tradición')}</h2><ul className="space-y-2 text-sm text-muted-foreground">{region.communities.map(community => <li key={community}>{community}</li>)}</ul></div>
      <div><h2 className="mb-4 text-2xl">{t('Técnicas y saberes')}</h2><ul className="space-y-2 text-sm text-muted-foreground">{region.techniques.map(technique => <li key={technique}>{t(technique)}</li>)}</ul></div>
    </section>
  </main>;
}