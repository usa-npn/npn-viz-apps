# npn-viz-apps

Angular workspace: three apps plus a shared library.

| Project | What it is |
|---|---|
| `projects/vis-tool` | The USA-NPN visualization tool. The app that matters. |
| `projects/npn/common` | `@npn/common` — shared library: services, models, all visualizations |
| `projects/fws-dashboard` | FWS refuge / phenology-trail dashboard (Drupal-embedded) |
| `projects/fws-spring` | FWS "Status of Spring" |

**fws-dashboard and fws-spring may be retired** — that decision is open as of 2026-08-12.
Several legacy endpoints are reachable *only* from fws-dashboard and are deliberately
parked pending it; see `docs/references/services-to-clean.md`.

## Build and verify

**Node 10.24.1 is required.** Anything newer dies in `node-sass` with
`Node Sass does not yet support your current environment: ... Unsupported runtime`, which
does not read like a version problem and will send you chasing the wrong thing.

`nvm use 10.24.1` does **not** update the current shell's `PATH` here — prepend
`C:\nvm4w\nodejs` to `PATH` after switching, then verify with `node --version`.

```
npx tsc -p projects/vis-tool/tsconfig.app.json --noEmit    # fast, no sass, any node
npm run builddev                                            # vis-tool dev   (~1 min)
npm run buildprod                                           # vis-tool AOT
npx ng build fws-dashboard --output-path <scratch>           # dev
```

`tsc --noEmit` does not check templates. An AOT (`--configuration=production`) build does,
and is the only thing that catches a renamed property still referenced in a template. It
takes ~8 minutes for fws-dashboard.

There is one spec file in the entire workspace (`static-color.spec.ts`); `npm test` is not
a meaningful signal.

## Service layer

Mid-migration off legacy hosts onto `https://services2-dev.usanpn.org` (v1) and Tinybird.
`docs/references/services-to-clean.md` is the live worklist. Conventions that the migrated
services follow — match them:

- **One service per data source or domain, and nothing else may build a URL**
  (`docs/requirements/REFACTORING-NOTES.md` §1). Selections and components inject a
  service; they never touch `NpnServiceUtils.*Url()`.
- **Guard optional config.** `servicesApiRoot` and `tinybirdApiRoot` are optional in
  `NpnConfiguration`. A service whose endpoint needs one rejects with a named error
  (`'No X endpoint configured (servicesApiRoot)'`) rather than requesting a URL that
  starts with `undefined`. See `ProgramService`, `ObservationService`, `BoundaryApiService`.
- **Caching tiers** (`CacheService`): `cachedGet`/`cachedPost` use sessionStorage and
  decline anything over `SESSION_CACHE_MAX_ENTRY_CHARS` (500K). `memCachedGet`/
  `memCachedPost` are for responses too large for that — individual phenometrics (~3M
  chars), the species list (~930K). Note `cachedGet` treats any **falsy** cached value as a
  miss, so a negative result cannot be cached through it.
- **Terminology: "network" is now "program."** New code says program (`ProgramService`,
  `Program.program_id`). The old term survives only where it is an external contract —
  `SelectionGroupMode.NETWORK` and `selection.networkIds` are `@selectionProperty()` and
  serialize into saved dashboards and shared vis-tool URLs; `entity.network_ids` comes from
  Drupal; the surviving legacy endpoints take `network_ids[n]` parameters. Do not rename
  those.

## Environment config

`projects/vis-tool/src/environments/environment{,.prod}.ts` supply `NpnConfiguration`
(`projects/npn/common/src/lib/common/config.ts`). Roots:

| Key | Points at |
|---|---|
| `servicesApiRoot` | v1 Nature's Notebook API — the migration target |
| `tinybirdApiRoot` / `tinybirdTokenUrl` | Tinybird pipes; JWT attached by `TinybirdAuthInterceptor` |
| `apiRoot` | Legacy `npn_portal`. **`www-dev.usanpn.org` no longer resolves** |
| `dataApiRoot` / `dataApiRoot2` | Legacy geo/web services, being retired |
| `observationPortalUrl` | Phenology Observation Portal search page — a **web app**, not a service; only ever a `window.open` target |

fws-dashboard and fws-spring have no `npnConfiguration` of their own and fall back to the
defaults in `npn-common.module.ts`, which still name dead hosts.

Before assuming a legacy endpoint works, probe it — several `npn_portal` routes are already
gone (`getObserversByMonth`, `getSiteVisitFrequency` both 404 on staging).

## Docs

- `docs/requirements/` — what a change must accomplish, including endpoint contracts
- `docs/plans/` — how it will be implemented, one per migration
- `docs/references/services-to-clean.md` — remaining legacy calls, curated by the user
