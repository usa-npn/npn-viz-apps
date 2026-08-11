# Plan: Retrofit Magnitude and Site-Level Data onto `/v1/data/*_phenometrics`

Implements `docs/requirements/magnitude-site-level-data.md`. Second step after
`docs/plans/summarized-data.md`. Two endpoints:

- **Magnitude** — `ActivityCurve.loadData` (`activity-curve.ts:333`), currently POSTing
  `/npn_portal/observations/getMagnitudeData.json` via a reach-through to
  `this.selection.serviceUtils`.
- **Site level** — `ObservationService.getSiteLevelData`, currently a stub returning `[]`.

The stub means the scatter plot's site branch and the **entire map visualization render
nothing today, in every environment**. There is no working baseline to regress. Magnitude
does work today, but this branch has never been released, so no fallback path is needed.

## Decisions

| # | Decision |
|---|---|
| 1 | `ObservationService` is injected into `ActivityCurvesSelection`; `activity-curve.ts` stops building URLs |
| 2 | One shared body builder in `observation.service.ts`, with per-endpoint extras |
| 3 | `taxon` / `phenophase_grain` derived from which `*_id[0]` key the plot chose |
| 4 | Site-level requests are chunked client-side at 4 years, on a calendar-aligned grid |
| 5 | Scatter plot default range drops from 16 years to 4 (`currentYear - 3`) |
| 6 | AGDD column renames fixed at the consumers, not aliased in the data layer |
| 7 | A shared `isNullData()` replaces the four `!== -9999` sentinel tests |
| 8 | Magnitude caches on the session tier, site level on the memory tier |
| 9 | A 413 on a site chunk triggers a bounded adaptive split; anything else rejects |

## What the endpoints actually require

Verified 2026-08-11 against the live `/openapi.json`, real POSTs to
`services2-dev.usanpn.org`, `tinybird/src/endpoints/{magnitude,site}_metrics.pipe`, and
`npn-services-serverless/src/tinybird/mappers/`.

### Transport

- **POST**, `Content-Type: application/json`. Bare JSON array response.
- Schemas are `additionalProperties: false`. Unknown keys are rejected.
- All 23 `required` fields have Zod defaults, and `joinArray` drops empty arrays before
  they reach Tinybird — so omitting a filter and sending `[]` are equivalent. The existing
  "send `[]` for everything" approach is fine but unnecessary.
- Ids must be **numbers**. `HttpParams` stringifies everything; `collectLegacyIds`
  (`observation.service.ts:17`) already exists for this and is reused.

### Parameter mapping

The full set of params any selection emits, traced through `toURLSearchParams`:

| Legacy param | Body field | Notes |
|---|---|---|
| `start_date` / `end_date` | `startDate` / `endDate` | unchanged |
| `station_id[n]` | `stations` | → `site_ids` in the mapper |
| `species_id[n]` | `species_ids` | |
| `genus_id[n]` / `family_id[n]` / `order_id[n]` / `class_id[n]` | `genus_ids` / `family_ids` / `order_ids` / `class_ids` | |
| `phenophase_id[n]` | `phenophase_ids` | **new capability** — the legacy call could not filter phenophase |
| `pheno_class_id[n]` | `pheno_class_ids` | |
| `taxonomy_aggregate=1` | `taxon` | `'species'\|'genus'\|'family'\|'order'\|'class'` (`'none'` is magnitude-only) |
| `pheno_class_aggregate=1` | `phenophase_grain` | `'phenophase'\|'pheno_class'` |
| `climate_data=1` | `include_climate:'1'` | **site only** — magnitude has no such flag |
| `frequency` | `frequency` | **magnitude only**; `'months'` passes through, `'14'`/`'7'` must be `Number()`d or Zod 400s |
| `num_days_quality_filter` | same name | **site only**; integer |
| `person_id` | `person_ids` | `[Number(v)]` |
| `request_src`, `group_id` | — | dropped |

Notes that cost real debugging time if missed:

- **`network_id[n]` is never set by anything.** Networks and boundaries are resolved to
  station ids client-side (`vis-selection.ts:478-496`). The
  `network_ids: collectLegacyIds(params,'network_id')` line already shipping at
  `observation.service.ts:57` is dead code.
- **`group_id` has no counterpart.** The shared filter block is 19 predicates; none is a
  group. `partnerGroups` is a different concept (POP populates it from `networkIds`).
- **Grain is orthogonal to the filters.** `magnitude_metrics.pipe:30` — "Grain is NEVER
  inferred from which filter was supplied." Both the id array *and* `taxon` must be sent.
  Deriving `taxon` from the key name is safe *client-side* only because
  `getSpeciesPlotKeys` picks that key from `plot.speciesRank`, so the two cannot disagree.
- **`pheno_class_ids` is the filter at pheno-class grain**, and it "does NOT unset
  phenophase_ids" (`magnitude_metrics.pipe:214-216`).
- **`state` XOR bounding box** — supplying both throws a `ValidationError`
  (`sharedFilters.ts:61`). Neither is used today.
- **No `include_taxonomic_detail` / `include_phenophase_detail` is needed.** At every
  grain the grain key is a core column (`Genus_ID` at `taxon='genus'`, `Pheno_Class_ID` at
  `phenophase_grain='pheno_class'`). Those flags add ranks *above* the grain.
  `toIndividualPhenometricsBody` sets them and its comment claims they are required to get
  `Genus_ID` — that appears to be wrong, but individual phenometrics is out of scope here.

### The real size limit

The OpenAPI text says "~5MB". It is wrong twice over:

- The byte budget is **26,214,400 bytes (25MB)**.
- The budget is almost never what trips. `tinybirdSyncExport.ts:230` aborts before window
  *i* if under `DEFAULT_MULTI_WINDOW_TIME_GUARD_MS` (5s) of Lambda time remains, and
  returns the **same 413 body** with no distinguishing field.

Measured, site level, `species_ids:[3] phenophase_ids:[371]`, national:

| Range | Windows | Result |
|---|---|---|
| 2024 | 1 | 200 · 218KB · 7.4s |
| 2011–2015 | 5 | 200 · 664KB · 14.4s |
| 2019–2022 | 4 | 200 · 989KB · 18.4s |
| 2023–2026 | 4 | 200 · 881KB · 17.9s |
| 2019–2026 | 8 | **413 · 18.8s** |
| 2011–2026 | 16 | **413 · 19.6s** |

The two halves that each succeed sum to 1.9MB — 7% of the budget. **The limit is
wall-clock across windows, roughly 4–5 years per request.** Narrowing species or stations
does not help; only narrowing the date range does.

Magnitude is unaffected: `magnitude_metrics` anchors buckets to `start_date` and is not
windowed, and `ActivityCurve.loadData` already issues one request per curve per year.

### Response shape

PascalCase, published USA-NPN headers. `lowercaseKeys` (`observation.service.ts:86`)
converts them to exactly the snake_case the client already reads. Verified against every
key each consumer touches:

- **Magnitude** — 9 of 10 metric ids and 5 of 6 `sampleSize` keys in
  `ACTIVITY_CURVE_KINGDOM_METRICS` match after lowercasing. The one exception is item 5
  below. `Start_Date`/`End_Date` arrive as `YYYY-MM-DD` strings, so `DOY()` in the `data()`
  setter is unchanged.
- **Site level** — `latitude`, `longitude`, `elevation_in_meters`, `state`, `site_id`,
  `mean_first_yes_doy`, `mean_first_yes_year`, `mean_numdays_since_prior_no`, all four
  `prcp_*`, all four `tmax_*`, all four `tmin_*`, `mean_daylength` and `mean_accum_prcp`
  all match. Two do not — item 4 below.
- **`filterUnwantedDataFunctor` works at every grain**: `species_id`, `genus_id`,
  `phenophase_id` and `pheno_class_id` are all present as core columns at their
  respective grains.

### Sentinels are gone

`site_metrics.pipe:86` — "**-9999 sentinels are real NULL throughout**". Magnitude returns
NULL for kingdom-blanked columns (all 18 abundance columns on plants; the two
`*Individuals_with_Yes*` columns on animals) and for `t*_mean`/`t*_se` where a tier has
0–1 qualifying site visits.

`null !== -9999` is **true**, so every existing guard passes nulls through.

One thing that does *not* break: magnitude **omits empty buckets entirely** rather than
emitting -9999 rows (`magnitude_metrics.pipe:332-334`). `ActivityCurve.draw`'s gap
detection keys off `dn.start_doy !== d.end_doy+1`, so missing rows still produce gaps.

## Steps

### 1. Data layer — `observation.service.ts`

Add the shared builder and both methods.

```ts
const RANK_KEYS = ['species_id','genus_id','family_id','order_id','class_id',
                   'phenophase_id','pheno_class_id'];
const TAXON_BY_KEY = {species_id:'species', genus_id:'genus', family_id:'family',
                      order_id:'order', class_id:'class'};

function buildPhenometricsBody(params: HttpParams): any {
    const body: any = {
        startDate: params.get('start_date') || '',
        endDate:   params.get('end_date')   || '',
        stations:  collectLegacyIds(params,'station_id'),
        taxon: 'species',
        phenophase_grain: 'phenophase'
    };
    RANK_KEYS.forEach(key => {
        const ids = collectLegacyIds(params,key);
        if (ids.length) {
            body[`${key}s`] = ids;
            if (TAXON_BY_KEY[key]) { body.taxon = TAXON_BY_KEY[key]; }
            if (key === 'pheno_class_id') { body.phenophase_grain = 'pheno_class'; }
        }
    });
    if (params.has('person_id')) { body.person_ids = [Number(params.get('person_id'))]; }
    return body;
}
```

`getMagnitudeData(params)` adds `frequency` (as a **number** unless `'months'`) and posts
via `cachedPost`. `getSiteLevelData(params)` adds `include_climate:'1'`,
`include_dispersion:'1'`, `num_days_quality_filter` when present, then chunks (step 2) and
posts each chunk via `memCachedPost`. Both `.then(rows => (rows||[]).map(lowercaseKeys))`
and both reject early when `servicesApiRoot` is unset, matching
`getIndividualPhenometrics`.

`include_dispersion` is what supplies `SD_First_Yes_in_Days`, which the map info window
reads at `map-visualization-marker-iw.component.ts:29`. Without it that column is absent.

### 2. Site-level chunking

Split `[startDate,endDate]` into ≤4-calendar-year sub-ranges on a fixed grid
(`Math.floor(year/4)*4`), clipped to the actual start and end, issued **sequentially**,
concatenated.

Two properties make this safe rather than merely convenient:

- `site_metrics` has **no year in its grain key** and already decomposes per phenological
  year server-side, so 4×4 years returns the same rows as one 16-year call.
- Every selection in this app builds calendar ranges (`${year}-01-01` … `${year}-12-31`),
  so calendar-chunk boundaries coincide exactly with the server's own window boundaries.
  This would need revisiting if a water-year range were ever introduced.

Grid alignment is for cache reuse — interior chunks keep their key when the user nudges an
endpoint. First and last chunks are clipped and so still re-key; that is deliberate, since
expanding them to full grid cells would push a chunk back to 4 windows and re-risk the
time budget.

On **413**, halve the chunk and retry, bounded (`MAX_SPLIT_DEPTH`, floor of one year). A
single year that still 413s rejects with a message naming the year. Any non-413 error
rejects immediately — partial data on a scatter plot is indistinguishable from years with
no observations.

### 3. DI plumbing — 3 files

- `activity-curves-selection.ts` — add `public observationService: ObservationService` to
  the constructor.
- `activity-curves-selection-factory.service.ts:16` — pass it through. This is the **only**
  construction site.
- `activity-curve.ts:346,354,360` — replace the `apiUrl` + `cachedPost` reach-through with
  `this.selection.observationService.getMagnitudeData(...)`, in both the grouped and
  ungrouped branches. Kills the reach-through called out in REFACTORING-NOTES §1a.

### 4. Consumer column renames — 2 lines

- `scatter-plot-selection.ts:10` — `gdd: 'mean_gdd'` → `gdd: 'mean_agdd'`.
- `map-visualization-marker-iw.component.ts:112` — `r.mean_gddf != -9999` →
  `r.mean_agdd_in_f != null` (and the same rename in `gddMarkerText`).

`KEYS_TO_NORMALIZE` exists precisely to indirect AXIS keys onto site-level column names,
so this is its intended use. No legacy aliases are left in the data layer.

### 5. Null handling — `isNullData()`

Export next to `NULL_DATA` in `vis-selection.ts`:

```ts
export const isNullData = (v: any): boolean =>
    v === null || v === undefined || v === NULL_DATA;
```

Apply at the four sites that test `!== -9999`:

| File | Line | Symptom if missed |
|---|---|---|
| `activity-curve.ts` | 290, 294 | null plots as a false **0** on the curve |
| `activity-curve.ts` | 230 | tooltip renders `N: null` |
| `map-visualization.component.ts` | 182 | null marker survives → NaN position |
| `scatter-plot-selection.ts` | 157 | null point plotted at 0 |

**Do in the same commit:** `activity-curve.ts:579` has `sampleSize:
'phase_per_hr_per_acre_sites_sample_size'`, missing the `in-` prefix of the published
`In-Phase_per_Hr_per_Acre_Sites_Sample_Size`. Today the lookup yields `undefined` and
`undefined === -9999` is false, so rows survive. But `isNullData(undefined)` is `true`, so
adding the helper without fixing the key would blank the "Animals In Phase per Hour per
Acre" metric entirely. Correct it to `in-phase_per_hr_per_acre_sites_sample_size` — which
also makes that filter work for the first time.

### 6. Scatter plot default range

`scatter-plot-selection.ts:49` — `start: number = 2011` → `(new Date()).getFullYear() - 3`.
Four years is exactly one chunk, so the default selection is provably a single request.
Chunking still covers users who widen the range; this just stops the default from leaning
on it (16 windows would be 4 sequential calls, ~70s).

### 7. Configuration

`servicesApiRoot` already exists in `NpnConfiguration` and in `vis-tool`'s dev environment.
Nothing to add for dev. `environment.prod.ts:24` still has it commented out — it must be
uncommented and the host confirmed before any production release, and it now gates three
endpoints rather than one.

## Known limitations after this change

- **Quality filter "off" means 30.** `toURLSearchParams:42` only emits
  `num_days_quality_filter` when `> 0`, and the pipe treats absent as its mandatory default
  of 30. A user who disables the control gets a 30-day two-sided filter, not none. Accepted
  for this pass; the fix is to send a no-op value (e.g. 36500) when disabled.
- **Grouped selections multiply requests.** `_getData` fans out with `Promise.all` across
  plots (`site-or-summary-vis-selection.ts:157`) and `MAX_PLOTS` is 6. A wide range on 6
  plots is up to 24 in-flight requests at ~18s each. Untested at that scale.
- **`getData()` still swallows errors** (`site-or-summary-vis-selection.ts:163-166`,
  REFACTORING-NOTES §3). The chunker's specific messages will reach `handleError` and the
  console, but the promise still resolves with `undefined`. Out of scope.
- **`group_id` is dropped** with no equivalent filter.
- **Async export is not used.** A single year that exceeds the time budget has no path
  other than narrowing the selection.

## Verification

Happy path, in the running app — no test scaffolding (explicitly out of scope). Activity
curves render for a plant metric; scatter plot renders at the new default; map
visualization renders for one year.

Both endpoints fail *silently* rather than loudly, so these console signals are the fastest
way to tell which layer broke:

```
filtered out 0/N unwanted records    <- id mapping is right at this grain
filtered out k/N LQD records         <- and NOT N/N
```

- Blank chart **with** `filtered out N/N` → a key-name mismatch; the request succeeded.
- Blank chart **with no filter logs at all** → the request was rejected; check the body.
- A curve dipping to 0 mid-series → a null slipped past `isNullData`.

Not covered by a happy-path pass, and therefore the most likely place for a later bug
report: higher-rank (genus/family/class) plots and pheno-class plots, which are the only
exercise of the `taxon` / `phenophase_grain` mapping.
