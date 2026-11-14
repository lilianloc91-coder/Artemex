<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Protected pages live under the managed `_authenticated` layout; Google login returns to a public auth page before navigating to the intended protected destination.
- Promoter profiles use owner-only database access and private photo storage; professional titles are descriptive data, never authorization roles.
- Internationalization uses a per-render i18next instance with Spanish SSR defaults and browser-only preference restoration; translated labels never replace stored profile, filter, contract or hash values.
- Bind i18next through the app's own React context instead of a separately prebundled React adapter to avoid mismatched React instances during preview dependency updates.
- Artisan banking details are transient form inputs; keep only salted domain-separated SHA-256 hashes in the mock catalog, never raw bank/account/CLABE values, because the current artisan flow is not a payment backend.
- Regional public microsites and map filters share an explicit editorial catalog with stable IDs and piece membership; this prevents translated labels or neighboring regions from mixing unrelated works.
- The user-requested Puebla municipal map uses locally stored boundary-only GeoJSON and dynamically loaded Leaflet; explicit municipality codes connect catalog regions to existing microsites, while the national Google map remains available separately to preserve coverage.
- Geographic maps use the Google Maps JavaScript loader with public browser credentials, callback initialization and tracking channel, and load Google only on authorized hosts (Lovable domains, the user-authorized published Vercel host, plus VITE_GOOGLE_MAPS_ALLOWED_HOSTS); other hosts show the region list with works, because unauthorized referrers make Maps throw.
- Initialize geographic maps only against a connected HTML container after the Maps library resolves; keep React out of the map-owned DOM and preserve filtered regional navigation on load/auth/runtime failures.
- Optional legacy catalog contracts are typed locally rather than added to the generated managed schema; preserve existing local fallback when those tables are unavailable.
- Catalog QR codes link to each piece's public verification record using a shared canonical URL; show only supplied transaction identifiers and distinguish catalog/testnet data from proven on-chain fields.
- Render passport QR modules with the React-independent qrcode-generator engine and a local hook-free SVG component; avoid React QR adapters that can capture a separate prebundled dispatcher.
- Use shared decorative illustrative artisan artwork behind piece histories, never as an identified artisan portrait; tiny regional originals are not evidence for invented photographic detail.
- Use the browser-safe price-breakdown helper for displayed purchase breakdowns and checkout totals; integer-cent arithmetic prevents rounding drift across views.
