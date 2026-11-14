import { useEffect, useRef, useState } from 'react';
import type { GeoJSON, Map as LeafletMap } from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import { MapPin, Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { type CulturalRegion } from '@/lib/regions';

type Municipality = { CVEGEO: string; CVE_MUN: string; NOMGEO: string };
export function PueblaMunicipalMap({ regions, onSelect }: { regions: CulturalRegion[]; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<GeoJSON | null>(null);
  const selection = useRef({ regions, onSelect });
  selection.current = { regions, onSelect };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;
    const element = container.current;
    void Promise.all([
      import('leaflet'),
      fetch('/maps/puebla-municipalities.geojson').then(response => {
        if (!response.ok) throw new Error('Municipal map unavailable');
        return response.json() as Promise<FeatureCollection<Geometry, Municipality>>;
      }),
    ]).then(([L, data]) => {
      if (!active || !(element instanceof HTMLElement) || !element.isConnected) return;
      const instance = L.map(element, { zoomControl: false, attributionControl: true, zoomSnap: 0.25, minZoom: 6, maxZoom: 12, scrollWheelZoom: false });
      map.current = instance;
      instance.attributionControl.setPrefix('Leaflet');
      instance.attributionControl.addAttribution('Límites: CONABIO 2022 / INEGI');
      const geo = L.geoJSON(data, {
        onEachFeature: (feature, polygon) => {
          const label = document.createElement('span');
          label.textContent = feature.properties.NOMGEO;
          polygon.bindTooltip(label, { sticky: true });
          polygon.on('add', () => {
            if (!('getElement' in polygon) || typeof polygon.getElement !== 'function') return;
            const path = polygon.getElement();
            if (!(path instanceof SVGElement)) return;
            path.setAttribute('data-municipality', feature.properties.CVE_MUN);
          });
          polygon.on('click', () => {
            const region = selection.current.regions.find(item => item.municipalityCode === feature.properties.CVE_MUN);
            if (region) selection.current.onSelect(region.id);
          });
        },
      }).addTo(instance);
      layer.current = geo;
      instance.fitBounds(geo.getBounds(), { padding: [24, 24] });
      instance.setMaxBounds(geo.getBounds().pad(0.5));
      observer = new ResizeObserver(() => instance.invalidateSize());
      observer.observe(element);
      setReady(true);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; observer?.disconnect(); map.current?.remove(); map.current = null; layer.current = null; };
  }, []);
  useEffect(() => {
    const element = container.current;
    if (!ready || !element || !layer.current) return;
    const styles = getComputedStyle(element);
    const color = (token: string) => styles.getPropertyValue(token).trim();
    layer.current.setStyle(feature => {
      const highlighted = regions.some(region => region.municipalityCode === feature?.properties.CVE_MUN);
      return { color: color('--map-line'), weight: highlighted ? 1.5 : 0.7, fillColor: color(highlighted ? '--map-active' : '--map-inactive'), fillOpacity: highlighted ? 0.9 : 0.6 };
    });
  }, [ready, regions]);
  return <section aria-label={t('Mapa municipal de Puebla')}>
    <div className="municipal-map relative isolate h-[470px] overflow-hidden rounded-lg border border-border sm:h-[640px]">
      <div ref={container} className="h-full w-full" />
      {ready && <div className="absolute left-3 top-3 z-[500] flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <Button variant="ghost" size="icon" title={t('Acercar')} aria-label={t('Acercar')} onClick={() => map.current?.zoomIn()}><Plus /></Button>
        <Button variant="ghost" size="icon" title={t('Alejar')} aria-label={t('Alejar')} onClick={() => map.current?.zoomOut()}><Minus /></Button>
        <Button variant="ghost" size="icon" title={t('Ver mapa completo')} aria-label={t('Ver mapa completo')} onClick={() => { if (layer.current) map.current?.fitBounds(layer.current.getBounds(), { padding: [24, 24] }); }}><Maximize /></Button>
      </div>}
      {!ready && <div role="status" className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">{t(failed ? 'Mapa no disponible · Explora las comunidades en la lista' : 'Cargando mapa…')}</div>}
      <div className="absolute bottom-8 left-3 right-3 z-[500] flex flex-wrap justify-center gap-2">
        {regions.map(region => <Button key={region.id} size="sm" variant="outline" className="bg-card text-foreground" onClick={() => onSelect(region.id)}><MapPin className="h-3 w-3" />{region.name}</Button>)}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-map-active" />{t('Municipio con obras en el catálogo')}</span>
      <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-border bg-map-inactive" />{t('Sin obras para estos filtros')}</span>
    </div>
  </section>;
}