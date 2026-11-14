import { describe, expect, it } from 'vitest';
import { filterRegions, getRegion, regionWorks } from '@/lib/regions';

describe('regional catalog', () => {
  it('shows only the three Cuetzalan works on its microsite', () => {
    const region = getRegion('cuetzalan');
    expect(region).toBeDefined();
    if (!region) throw new Error('Missing Cuetzalan');
    expect(regionWorks(region).map(piece => piece.id)).toEqual(['TK-0701', 'TK-0702', 'TK-0703']);
  });
  it('routes Acatlán to the Tecuani rather than neighboring works', () => {
    const region = getRegion('acatlan');
    if (!region) throw new Error('Missing Acatlán');
    expect(region.name).toBe('Acatlán de Osorio');
    expect(region.municipalityCode).toBe('003');
    expect(regionWorks(region).map(piece => piece.id)).toEqual(['TK-0512']);
  });
  it('maps each catalog municipality to its own public microsite', () => {
    expect(getRegion('cuetzalan')?.municipalityCode).toBe('043');
    expect(getRegion('puebla')?.municipalityCode).toBe('114');
    expect(filterRegions('tecuani', 'Puebla', []).map(region => region.id)).toEqual(['acatlan']);
  });
  it('combines state, craft and accent-insensitive community search', () => {
    expect(filterRegions('cuetzalan', 'Puebla', ['Cestería']).map(region => region.id)).toEqual(['cuetzalan']);
    expect(filterRegions('acatlan', 'Puebla', ['Textil'])).toEqual([]);
    expect(filterRegions('olinala', 'all', ['Laca']).map(region => region.id)).toEqual(['olinala']);
  });
  it('rejects unknown region IDs', () => { expect(getRegion('not-a-region')).toBeUndefined(); });
});
describe('Google Maps domain gate', () => {
  it('allows the authorized published Vercel host but not other Vercel projects', async () => {
    const { mapsHostAllowed } = await import('@/components/toltek/RegionsMap');
    expect(mapsHostAllowed('ancestral-craft-passport.lovable.app', '')).toBe(true);
    expect(mapsHostAllowed('tlamatik.vercel.app', '')).toBe(true);
    expect(mapsHostAllowed('other.vercel.app', '')).toBe(false);
    expect(mapsHostAllowed('tlamatik.vercel.app', 'tlamatik.vercel.app')).toBe(true);
    expect(mapsHostAllowed('preview.tlamatik.mx', '*.tlamatik.mx')).toBe(true);
    expect(mapsHostAllowed('localhost', 'localhost')).toBe(false);
  });
});
