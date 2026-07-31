# Plan: Retrofit `getSummarizedData` onto `/v1/data/individual_phenometrics`

Implements `docs/requirements/summarized-data.md`. Scope is one endpoint: the
`individualPhenometrics === true` branch at `site-or-summary-vis-selection.ts:86`.
The `getSiteLevelData` branch is untouched.

## Decisions

- Endpoint config and URL construction centralize in **`NpnServiceUtils` / `NpnConfiguration`**,
  alongside the existing `apiRoot` / `dataApiRoot` / `dataApiRoot2` roots.
- The call itself stays where it is. No new service in this pass
  (`ObservationService` remains the later refactor described in `REFACTORING-NOTES.md` §1).
- Climate axes are left exactly as they are — the new endpoint returns no climate
  columns yet, and they are expected to come back server-side.
- The `num_days_quality_filter_individual` behavior is preserved client-side.

## What the new endpoint actually requires

Verified against the live `/openapi.json` and real POSTs on 2026-07-29:

- **POST only**, `Content-Type: application/json`. A GET 404s.
- Request schema is `additionalProperties: false` and requires 12 fields
  (`startDate`, `endDate`, `state`, `species_ids`, `species_names`, `network_ids`,
  `dataset_ids`, `phenophaseCategories`, `stations`, `individual_ids`, `partnerGroups`,
  `integrated_datasets`). Empty arrays are acceptable; unknown keys are rejected.
- **No phenophase filter, no `num_days_quality_filter_individual`, no
  `taxonomy_aggregate` / `pheno_class_aggregate`, no climate columns.**
  The `include_*` flags had no observable effect on the response.
- Response is a bare array of rows in **legacy PascalCase** (`First_Yes_DOY`,
  `NumDays_Since_Prior_No`, `Individual_ID`, `Elevation_in_Meters`, …).
- No authentication required.

## Steps

### 1. Configuration (6 environment files + 2 library files)

- `common/src/lib/common/config.ts` — add one field to `NpnConfiguration`, e.g.
  `servicesApiRoot: string; // URL of the Nature's Notebook v1 API`.
- `common/src/lib/common/npn-service-utils.service.ts` — add the matching
  `servicesApiUrl(suffix)` helper next to the existing `*Url` methods.
- Set the root in all six environment files
  (`vis-tool`, `fws-dashboard`, `fws-spring` × dev/prod):
  dev `https://services2-dev.usanpn.org`, prod `https://services.usanpn.org`
  (confirm the prod hostname before merging).

### 2. Request adaptation (`site-or-summary-vis-selection.ts`)

Keep calling `toURLSearchParams()` — it already performs the async station/boundary
resolution the whole selection hierarchy depends on. Add one private adapter that
translates the resulting `HttpParams` into the JSON body:

- `start_date` / `end_date` → `startDate` / `endDate`
- `species_id[n]` → `species_ids`
- `station_id[n]` → `stations`
- `network_id[n]` → `network_ids`
- populate the remaining required keys as `[]`
- **drop** `phenophase_id[n]`, `num_days_quality_filter_individual`, `climate_data`,
  `taxonomy_aggregate`, `pheno_class_aggregate`, `request_src` — `additionalProperties: false`
  rejects them.

Then post JSON rather than form-encoded. `cachedPost` sets
`Content-Type: application/x-www-form-urlencoded` (`npn-service-utils.service.ts:88`),
so this needs either a JSON variant of `post`/`cachedPost` or a content-type argument.
Prefer an optional parameter over a parallel method.

### 3. Response normalization

The single highest-value line in this change. Downstream code — `filterSuspectSummaryData`,
`filterLqSummaryData`, `filterUnwantedDataFunctor`, `getDoy`/`getFirstYesYear`
(`scatter-plot-selection.ts:144-148`), and every `AXIS` key — reads snake_case.

Lowercasing each response key produces exactly the legacy names
(`First_Yes_DOY` → `first_yes_doy`, `NumDays_Since_Prior_No` → `numdays_since_prior_no`,
`Elevation_in_Meters` → `elevation_in_meters`). One `reduce` over `Object.keys` per row,
applied before `filterLqd`, and nothing downstream changes.

**Without this the LQD filter silently drops 100% of rows and the chart renders blank
with no error** — the failure mode is invisible, so do this in the same commit as step 2.

### 4. Restore the quality filter client-side

`NumDays_Since_Prior_No` is present in the response, so extend `filterLqSummaryData`
to keep rows where the value is `>= 0` **and** `<= numDaysQualityFilter`. Treat `null`
as failing — the API emits `null` for absent values where the legacy service used a
sentinel. Preserves today's behavior and keeps the existing UI control meaningful.

### 5. Surface the 413

The 5 MB cap will be hit in normal use (see below). `_getData` currently swallows errors
(`site-or-summary-vis-selection.ts:158-161`, also noted in `REFACTORING-NOTES.md` §3), so a
413 becomes another blank chart. Map it to a message that names the cause — oversized
query — rather than fixing the broader error-swallowing here.

### 6. Verify the happy path

Scatter plot in `vis-tool`, "Use Individual Phenometrics" checked, on a deliberately
narrow selection (1–2 years, one species, station or state constrained) so the response
stays under the cap. Confirm: points render, the four non-climate axes
(Latitude, Longitude, Elevation, Year) work, and the console filter counts show records
surviving rather than everything being discarded.

## Server-side follow-up (not client work)

Measured 2026-07-29, `species_id=3`, national, 2018, sampled by month:

| Scope | Rows | Raw | vs. 5 MB cap |
|---|---|---|---|
| cap at 767 B/row | ~6,700 | 5.0 MB | — |
| 1 species × 1 year | ~10,100 | 7.4 MB | 1.5× |
| 1 species × 5 years | ~50,500 | 36.9 MB | 7.4× |
| 1 species × 16 years (scatter-plot default) | ~161,500 | 118 MB | 23.6× |

1. **Compression is off.** `Accept-Encoding: gzip` returns an uncompressed body with no
   `Content-Encoding`. The payload gzips **42.8×** — 61% of each row is repeated column
   names, and the taxonomy/phenophase description columns repeat verbatim per row. With
   gzip the 16-year query is 2.8 MB, inside the current cap. Also clarify whether the cap
   is measured before or after compression.
2. **Add a phenophase filter.** Species 3 spans 11 phenophases; the largest is 30.6% of
   rows. Without `phenophase_ids` the client over-fetches 3.3×–11× and discards the
   remainder locally.
3. **Climate columns**, needed by 15 of the 19 scatter-plot axes.
4. **Taxonomic and phenophase-class aggregation**, currently reachable via
   `taxonomy_aggregate` / `pheno_class_aggregate`.

Items 3 and 4 are known gaps for this pass, not blockers on it.

## Known limitations after this change

- Climate axes return no data while `individualPhenometrics` is on.
- Genus/family/class-rank plots and phenophase-class plots lose server-side aggregation.
- Large date ranges fail with a 413 until the cap or compression is addressed.
