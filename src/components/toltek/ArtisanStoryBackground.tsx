import artisanScene from '@/assets/artisan-story-background.jpg';

/** Decorative illustrative artwork, not an identified artisan portrait. */
export function ArtisanStoryBackground() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    <img src={artisanScene} alt="" width={1024} height={1536} loading="lazy" className="h-full w-full scale-105 object-cover object-right blur-[3px] opacity-70" />
    <div className="absolute inset-0 bg-indigo/60" />
    <div className="absolute inset-0 bg-linear-to-r from-indigo/80 via-indigo/35 to-indigo/10" />
  </div>;
}