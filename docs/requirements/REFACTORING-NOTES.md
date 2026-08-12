# Refactoring Notes

Findings from a code-structure review conducted 2026-07-29. Nothing here is urgent or
breaking — the application works. This is a record of structural debt worth paying down
opportunistically, ordered roughly by leverage-to-risk ratio.

The review sampled `species.service.ts`, `site-or-summary-vis-selection.ts`,
`vis-selection.ts`, `npn-service-utils.service.ts`, and
`visualization-selection-factory.service.ts`, then surveyed the workspace
(214 TS files, ~21k LOC).

---

## What's already good

Worth stating up front, so a future refactor doesn't discard things that are working.

- **The workspace layout is correct.** `projects/npn/common` as a shared library consumed
  by `vis-tool`, `fws-dashboard`, and `fws-spring` is the right Angular idiom.
- **HTTP access is funneled through one place.** No raw `HttpClient` is scattered around;
  everything goes through `NpnServiceUtils`. Base URLs come from the injected
  `NPN_CONFIGURATION` token, so environments are swappable. Caching is centralized.
- **The serialization scheme is clever and documented.** `@selectionProperty()` plus the
  `external` getter/setter (`vis-selection.ts:89-126`) lets a visualization's full state
  round-trip to JSON for URL sharing. The `_`-prefix convention is explained at
  `vis-selection.ts:16-32`.
- **`$class` instead of `constructor.name`** (`vis-selection.ts:167-174`) is a deliberate
  fix for minification breaking class names in production. Don't "simplify" it away.
- **The selection inheritance chain is coherent.** `VisSelection` →
  `NetworkAwareVisSelection` → `StationAwareVisSelection` → `SiteOrSummaryVisSelection`,
  each layer adding one dimension of query params and cooperatively extending
  `toURLSearchParams` via `super`.
- **Comments explain *why*.** e.g. `site-or-summary-vis-selection.ts:165-175` records that
  the backend treats species and phenophase as independent rather than parallel arrays.
  That's institutional knowledge; preserve it through any refactor.

---

## The core structural issue

**Model objects are also the data-fetching layer.**

`SiteOrSummaryVisSelection` is simultaneously:

1. UI/form state (`plots`, `numDaysQualityFilter`)
2. a serialization target (the `@selectionProperty` decorators)
3. an event emitter driving the chart component
4. an HTTP client (`_getData`, `site-or-summary-vis-selection.ts:82`)
5. a data-cleaning pipeline (`filterLqd` and the four module-level `filter*` functions)
6. an export adapter for another system (`toPOPInput`)

Consequences that follow directly from this:

- `NpnServiceUtils` must be constructor-injected into what is conceptually a value object.
- **23 files contain `SelectionFactory` boilerplate**, existing solely because Angular DI
  can't construct these on demand otherwise. In a conventional design — plain-data
  selections, a service that takes a selection and returns data — the factories vanish.
- The genuinely testable logic is trapped inside DI-dependent classes or module-private
  functions, which is why there is **1 spec file across 214 TS files**.

---

## 1. Endpoint sprawl (highest priority)

URLs are constructed in **31 places across 15 files**. Only 14 of those sit in an actual
service. The other **17 are in 11 classes that are not services**: six vis-selections, the
*abstract base* selection, a map layer, a map layer *legend*, an activity *curve*, and a UI
component. `NpnServiceUtils` is injected in 25 places — it functions as a public
URL-concatenation utility rather than a data-source layer.

### 1a. Objects reach through other objects to borrow an HTTP client

```ts
this.wcsDataService.serviceUtils.dataApiUrl(...)   // pest-map-layer-legend.ts:44
this.layerService.serviceUtils.dataApiUrl(...)     // pest-map-layer.ts:140
this.selection.serviceUtils.apiUrl(...)            // activity-curve.ts:346
```

`serviceUtils` is declared `public` on those classes specifically to permit this.

### 1b. The same endpoint defined three times, with three different behaviors

`/v1/agdd/{method}/pointTimeSeries`:

| Location | Fallback when `agddMethod` is missing |
| --- | --- |
| `pest-map-layer-legend.ts:44` | `pest.agddMethod` — yields `/v1/agdd/undefined/...` |
| `pest-map-layer.ts:140` | `pest.agddMethod \|\| 'simple'` |
| `agdd-time-series-selection.ts:257` | hardcoded `simple` |

This is a live inconsistency, not a hypothetical one.

### 1c. Station fetching lives in three places, two of which aren't the station service

`station.service.ts:13`, `network.service.ts:23`, and `vis-selection.ts:634,641`. The last
puts boundary/polygon station-lookup URLs in the abstract root of the selection hierarchy,
so every visualization inherits them whether or not it needs them.

### 1d. One endpoint, two incompatible access paths, same file

`getSpeciesFilter.json` at `species.service.ts:97` (plain object in, `cachedPost`, session
cache) and again at `:124` (`HttpParams` in, private `higherSpeciesCache`, bypasses the
session cache). Same URL, two signatures, two caching semantics, no indication to a caller
which to use.

### 1e. The URL-root method names are content-free

`apiUrl` / `dataApiUrl` / `dataApiUrl2` / `geoServerUrl` (`popApipUrl` — the typo was the
real method name — has since been deleted along with `popApiRoot`). A call site can't tell
which backend it hits or why there are two data APIs. Already flagged by `@todo` in both `config.ts:4` and `npn-service-utils.service.ts:8`.

### Target shape

One service per data source or domain, each owning its endpoints, with nothing else
permitted to build a URL:

| Service | Endpoints | Status |
| --- | --- | --- |
| `SpeciesService` | `species/`, `phenophases/` | exists |
| `StationService` | `stations/` | exists, underused |
| `NetworkService` | `networks/`, `v0/networks` | exists |
| `BoundaryService` | `v0/boundaries` | exists |
| `ObservationService` | `observations/*` | **missing** — 5 selections inline this |
| `AgddService` | `v1/agdd/*` | **missing** — 3 files inline this |
| `PestService` | `v1/phenoforecasts/*` | **missing** |
| `SavedSearchService` | `v1/saved_search` | exists — replaced the planned `PopService`; also owns the observation portal URL the export is forwarded to |

Three services were never created, so their endpoints scattered into whatever class needed
the data. No single bad decision — just repeated path-of-least-resistance when the right
home didn't exist.

### Suggested approach

1. Create `ObservationService` first — highest traffic, duplicated across five selections.
2. Move the URL strings into it; selections call
   `observationService.getSiteLevelData(params)` instead of building a URL.
3. Convert selections **one at a time**; each conversion is independent and low-risk.
4. Then `AgddService`, `PestService`, `PopService`.
5. **Enforcement trick:** flip `serviceUtils` from `public` to `private` in
   `NpnServiceUtils`' consumers. Every reach-through chain stops compiling and the compiler
   hands you the exact list of remaining offenders.

Side benefit: once `_getData` no longer performs HTTP, the filter functions in
`site-or-summary-vis-selection.ts` become plain testable code.

---

## 2. Duplication in `species.service.ts` (cheap, safe, high yield)

- `_getPhenophases` (`:313`) and `_getPhenodefinitions` (`:353`) are ~35 lines that are
  character-for-character identical except the final `removeRedundant*` call. The four
  public method pairs below them duplicate the same way. Collapse to one method with a
  dedupe-strategy argument.
- `removeRedundantPhenophases` (`:455`) uses `let seen = []` while
  `removeRedundantPhenodefinitions` (`:466`) uses `let seen = {}`. The array-as-sparse-map
  works but is unintentional.
- **The rank → column-name switch is written five times**: `getSpeciesPlotKeys` (`:49`),
  `getSpeciesIds` (`:268`), `_getPhenophases` (`:319`), `_getPhenodefinitions` (`:359`).
  ~120 lines of switch statements that collapse into a six-entry lookup object. Adding a
  taxonomic rank currently means finding all five sites.

Estimated deletion: ~200 lines, with no behavior change.

---

## 3. Correctness issues worth fixing regardless of the refactor

- **Rejected promises are cached permanently.** `higherSpeciesCache`
  (`species.service.ts:104`) stores the promise before it resolves. Good for request
  dedup, but one network blip poisons that key for the rest of the session. The map is also
  unbounded with no eviction.
- **Inconsistent cache aliasing.** `JSON.parse(JSON.stringify(results))`
  (`species.service.ts:116,128`) means the *first* caller receives the shared object and
  later callers receive copies — so the first caller can mutate everyone else's cached data.
- **`getData()` swallows errors.** `site-or-summary-vis-selection.ts:158-161` catches, logs,
  and returns `undefined`, so the promise *resolves* with nothing rather than rejecting.
  Callers can't distinguish "server error" from "no data found" — a likely source of
  mystery blank charts.
- **`getSpeciesIds`** (`species.service.ts:258`) fetches the entire unfiltered species list
  to resolve a handful of IDs client-side.
- **Shared-variable mutation in an async map.** `vis-selection.ts:528-531` reassigns the
  outer `params` from inside concurrent `.then` callbacks. It currently works only because
  `HttpParams` is immutable and each iteration restarts from `resetParams`. Fragile.

---

## 4. Type-safety and hygiene

- **`[x: string]: any`** on `VisSelection` (`vis-selection.ts:187`) and on
  `SiteOrSummaryPlot` (`site-or-summary-vis-selection.ts:6`) disables property checking on
  the most important class in the codebase. Typo'd property names become silent runtime
  bugs. It exists to support the reflection-based serialization; a narrower index signature
  or an explicit bag property would recover most of the type safety.
- **A base class special-cases a subclass by string literal.** `vis-selection.ts:282`:
  `|| this.$class==="ActivityCurvesSelection"`, buried in the event-throttle condition.
  Should be a `protected` flag the subclass overrides.
- **171 `console.*` calls in shipped code**, including one firing on every selection event
  (`vis-selection.ts:284`). There's an unused-for-this-purpose `debug` flag on
  `VisSelection`. No logging abstraction, no off switch.
- **Essentially no tests**: one `.spec.ts` across 214 TS files / ~21k LOC. Downstream of
  issue §1 — the pure logic isn't reachable without standing up DI.

---

## 5. Framework currency (largest risk, largest cost)

The project is on **Angular 6** (late 2018) — roughly seven years and fourteen major
versions behind.

- `@angular/http` is still a declared dependency but is **imported nowhere**; safe to drop
  immediately.
- `tslint` has been deprecated for years; `eslint` is the migration path.
- `@agm/core` is pinned to a beta (`^1.0.0-beta.5`).
- RxJS 6.2; `.toPromise()` is used at the `NpnServiceUtils` boundary. That's a single
  deliberate decision rather than scattered sloppiness, but the cost is no cancellation —
  `_getData` fires N parallel requests via `Promise.all` with no way to abort when the user
  changes selection mid-flight, so a stale response can win the race.

This constrains tooling, dependency upgrades, security patching, and hiring. It's the
single largest structural risk, but also the most expensive item here. The §1 refactor
would ideally land alongside or before an upgrade, not after.

---

## Suggested ordering

| # | Work | Cost | Risk | Payoff |
| --- | --- | --- | --- | --- |
| 1 | §2 — de-duplicate `species.service.ts` | low | low | ~200 lines deleted |
| 2 | §3 — error swallowing + cache poisoning | low | low | fixes real user-visible bugs |
| 3 | §1 — extract `ObservationService`, convert selections incrementally | medium | low per step | unblocks testing; stops endpoint sprawl |
| 4 | §1 — remaining services; make `serviceUtils` private | medium | low | enforced boundary |
| 5 | §5 — Angular upgrade | high | high | unblocks everything else |
| 6 | §1 — separate fetching from the selection model entirely (removes the 23 factories) | high | high | the real fix; pair with §5 |

Items 1–3 are safe to do piecemeal in normal feature work. Items 5–6 need to be planned as
actual projects.
