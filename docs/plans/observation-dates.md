# Plan: Migrate the Calendar onto `/v1/data/observation_dates`

Implements the client half of `docs/requirements/observation-dates-endpoint.md`. **Do not
start until that endpoint is live** — there is no fallback path and no way to verify
against the legacy one (see "Verification" below).

Fourth and last of the `apiRoot` migrations that matter to the vis tool. Prior art, in
order: `docs/plans/summarized-data.md`, `docs/plans/magnitude-site-level-data.md`, then the
programs/sites work recorded in `docs/references/services-to-clean.md`.

## Decisions

| # | Decision |
|---|---|
| 1 | A new `ObservationDateService` owns the URL and body; the selection stops building URLs |
| 2 | One request per `SelectionGroup`, not one per plot — see below |
| 3 | Session cache tier (`cachedPost`), not the memory tier |
| 4 | Reject with a named error when `servicesApiRoot` is unset, matching the sibling services |
| 5 | `postProcessData` is rewritten to group flat rows; its output shape and row ordering are unchanged |
| 6 | Presence is `count > 0`; nothing else about `count` reaches the chart |

## Why groups still fan out (Decision 2)

The requirements doc collapses the *plot* fan-out — one request now carries every taxon and
phenophase, and the client filters the cross product locally. **Groups are different.**
A `SelectionGroup` partitions by station set (`toGroupHttpParams`, `vis-selection.ts:534`),
so each group needs its own `stations` array and therefore its own request. Keep that loop.

Net effect: `plots × groups` requests today becomes `max(1, groups)` requests.

Groups are only ever populated by fws-dashboard; the vis tool never sets them. So in the
vis tool this is always exactly one request.

## What `postProcessData` must preserve

The rewrite replaces the `[0].phenophases[0].years[year]` unwrap with a group-by over flat
rows. Everything else about the function is load-bearing and easy to break silently
(`observation-date-vis-selection.ts:116-163`):

- **Row index descends.** `y` starts at `(plots.length * years.length) - 1` and decrements
  once per (plot, year) in iteration order.
- **Labels are prepended**, `labels.splice(0, 0, …)` — so label array order is the inverse
  of `y`. The two conventions have to stay in sync or every row gets the wrong caption.
- **Label format**, exactly:
  `` ` ${year}: ` + speciesTitle.transform(plot.species, plot.speciesRank) + ' - ' + (phenophase_name || pheno_class_name) + (group ? ` (${group.label})` : '') ``
  Note the leading space before `${year}`.
- **Negative before positive.** When `this.negative` is set, negative DOYs are pushed first
  with `this.negativeColor`, then positives with `plot.color`. Both land on the same row at
  the same x; `calendar.component.ts:143` keys the d3 join on `(y, x, color)` so both
  survive as separate elements and the later-inserted one covers the other. Preserve the
  order — reversing it changes which is visible.
- **Group-mode colors** are assigned by the caller, not the plot:
  `plot.color = getStaticColor(plotIndex++)` over the `plots × groups` iteration
  (`_getData` line 205). Whatever replaces that loop must assign colors in the same
  sequence or plot colors shift.
- **Empty guard**: `if (!data || !data.length) return null;` — the calendar's `redrawSvg`
  depends on the null.

The returned `ObservationDateData` shape (`{labels: string[], data: {x,y,color}[]}`) does
not change. `calendar.component.ts` should need no edits at all.

## Work

1. **`observation-date.service.ts`** in `projects/npn/common/src/lib/common/`, next to
   `observation.service.ts`. Owns `servicesApiUrl('/v1/data/observation_dates')`, the body
   builder, and the `servicesApiRoot` guard. Export from `public_api.ts`, provide in
   `npn-common.module.ts`. Body building can reuse the `collectLegacyIds` /
   `buildPhenometricsBody` approach in `observation.service.ts:17-130` — same field names,
   plus `years`, minus the date range.
2. **`_getData`** (line 170): delete `fetchDataForPlot` and the rank-key branching; call the
   service once per group (or once, ungrouped); demultiplex rows to plots by
   (taxon id, phenophase id).
3. **`toURLSearchParams`** (line 80): drop the `request_src` line. Keep `year[i]` only if
   the params object is still used to carry station ids into the body builder.
4. **`postProcessData`** (line 116): per the section above.
5. **Delete** `requestSrc` from `ObservationDateVisSelection` (line 29) and the dead
   `requestSrc` on `CalendarSelectionFactory` (line 7) — it was never applied.

## Verification

**Node 10.24.1 is required.** Anything newer fails in `node-sass` with
`Node Sass does not yet support your current environment`, which does not look like a
version problem. `nvm use 10.24.1`, then prepend `C:\nvm4w\nodejs` to `PATH` — `nvm use`
alone does not update the current shell.

```
npx tsc -p projects/vis-tool/tsconfig.app.json --noEmit
npm run builddev                      # vis-tool, dev
npm run buildprod                     # vis-tool, AOT — catches template errors tsc misses
```

`ng build fws-dashboard --output-path <scratch>` if the shared library changed; that app is
the other consumer of the visualization module. The AOT build takes ~8 minutes.

**There is no live baseline to compare against.** Staging (`services-staging.usanpn.org`,
which is `apiRoot` in `environment.prod.ts`) returned `{"error_message":"No results found"}`
for every species/phenophase/year tried on 2026-08-12, and the dev host
`www-dev.usanpn.org` does not resolve at all. So the Calendar cannot be exercised against
the old endpoint to diff behaviour — correctness has to come from reading
`postProcessData` and from the new endpoint's own tests.
