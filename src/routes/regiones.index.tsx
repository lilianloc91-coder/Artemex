import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { ArrowRight, MapPin, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { craftFilters, culturalRegions, filterRegions, regionWorks } from '@/lib/regions';
import { RegionsMap } from '@/components/toltek/RegionsMap';
import { PueblaMunicipalMap } from '@/components/toltek/PueblaMunicipalMap';

export const Route = createFileRoute('/regiones/')({
  head: () => ({ meta: [
    { title: 'Regiones — Mapa de oficios y comunidades | Tlamatik' },
    { name: 'description', content: 'Explora México a través de sus comunidades, técnicas y artesanías en el catálogo cultural Tlamatik.' },
    { property: 'og:title', content: 'Regiones y oficios de México — Tlamatik' },
    { property: 'og:description', content: 'Mapa territorial de comunidades y obras artesanales con pasaporte cultural.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: Regions,
});
function Regions() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [state, setState] = useState('all');
  const [crafts, setCrafts] = useState<string[]>([]);
  const [mapView, setMapView] = useState<'puebla' | 'mexico'>('puebla');
  const regions = filterRegions(query, state, crafts);
  const selectRegion = useCallback((region: string) => { void navigate({ to: '/regiones/$region', params: { region } }); }, [navigate]);
  const reset = () => { setQuery(''); setState('all'); setCrafts([]); };
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
    <p className="mb-2 text-xs font-semibold uppercase text-primary">{t('Regiones')} · Tlamatik</p>
    <h1 className="text-3xl sm:text-4xl">{t('Mapa de Oficios y Comunidades')}</h1>
    <p className="mt-3 text-sm text-muted-foreground">{t('Exploración territorial de la artesanía en México')}</p>
    <div className="mt-6 flex flex-wrap gap-2" aria-label={t('Regiones')}>
      <Button variant={mapView === 'puebla' ? 'default' : 'outline'} aria-pressed={mapView === 'puebla'} onClick={() => setMapView('puebla')}>{t('Municipios de Puebla')}</Button>
      <Button variant={mapView === 'mexico' ? 'default' : 'outline'} aria-pressed={mapView === 'mexico'} onClick={() => setMapView('mexico')}>{t('Todas las regiones')}</Button>
    </div>
    <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0" aria-label={t('Explorador territorial')}>
        {mapView === 'puebla' ? <PueblaMunicipalMap regions={regions.filter(region => region.state === 'Puebla')} onSelect={selectRegion} /> : <RegionsMap regions={regions} onSelect={selectRegion} />}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{t('Comunidades con obras en el catálogo')}</span>
          <span>{t('{{count}} comunidades', { count: regions.length })}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('Catálogo cultural de muestra · Cobertura no exhaustiva')}</p>
        {mapView === 'puebla' && <p className="mt-2 text-xs text-muted-foreground">{t('Límites: CONABIO 2022 / INEGI · Adaptación de ArteMex; licencia de la copia pendiente de confirmar.')}</p>}
      </section>
      <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl">{t('Filtros')}</h2><Button variant="ghost" size="sm" onClick={reset}><RotateCcw />{t('Restablecer')}</Button></div>
        <label htmlFor="region-search" className="text-xs font-medium">{t('Buscar comunidad, obra o técnica')}</label>
        <div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input id="region-search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Ej. Cuetzalan o telar')} className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" /></div>
        <label htmlFor="region-state" className="mt-5 block text-xs font-medium">{t('Estado / región')}</label>
        <select id="region-state" value={state} onChange={e => setState(e.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="all">{t('Todos los estados')}</option>{[...new Set(culturalRegions.map(region => region.state))].map(state => <option key={state}>{state}</option>)}</select>
        <fieldset className="mt-5"><legend className="mb-3 text-xs font-medium">{t('Oficios')}</legend><div className="flex flex-wrap gap-2">{craftFilters.map(craft => <Button key={craft} size="sm" variant={crafts.includes(craft) ? 'default' : 'outline'} aria-pressed={crafts.includes(craft)} onClick={() => setCrafts(current => current.includes(craft) ? current.filter(item => item !== craft) : [...current, craft])}>{t(craft)}</Button>)}</div></fieldset>
        <h2 className="mb-3 mt-7 text-xl">{t('Comunidades')}</h2>
        <div className="divide-y divide-border">{regions.map(region => <Link key={region.id} to="/regiones/$region" params={{ region: region.id }} className="group flex items-center justify-between gap-3 py-4 text-sm hover:text-primary"><div className="min-w-0"><span className="block font-medium">{region.name}</span><span className="mt-1 block text-xs text-muted-foreground">{region.state} · {t('{{count}} obras', { count: regionWorks(region).length })}</span></div><ArrowRight className="h-4 w-4 shrink-0" /></Link>)}</div>
        {regions.length === 0 && <p role="status" className="py-5 text-sm text-muted-foreground">{t('No hay comunidades con estos filtros.')}</p>}
      </aside>
    </div>
  </main>;
}