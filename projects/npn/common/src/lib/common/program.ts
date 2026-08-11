/**
 * A tag associated with a program (e.g. "Botanical Garden or Arboretum").
 */
export interface ProgramTag {
    tag_id: number;
    name: string;
    /** Whether this tag represents a group (1) or not (0). */
    is_group?: number;
}

/**
 * A Local Phenology Program (LPP), as returned by `{servicesApiRoot}/v1/programs`.
 *
 * This is the domain object formerly called a "network" -- `program_id` is the same
 * identifier the legacy `/v0/networks` endpoint and the `network_id` request parameters
 * still in use elsewhere refer to. The naming here follows the current API and the
 * current domain language; the older term survives only where it is part of an external
 * contract (Drupal entity fields, serialized vis selections, legacy query parameters).
 */
export interface Program {
    profile_id: number;
    /** Program identifier -- the value historically called `network_id`. */
    program_id: number;
    name: string;
    description?: string;
    contact_name?: string;
    contact_email?: string;
    /** Whether contact info is public (1) or private (0). */
    contact_public?: number;
    // Declared as `number` in the OpenAPI schema but delivered as decimal strings by the
    // live endpoint (verified 2026-08-11), hence both. Coerce before doing arithmetic.
    latitude?: number | string;
    longitude?: number | string;
    website?: string;
    /** Whether the program is active (1) or inactive (0). */
    active?: number;
    /** Whether the program is hidden (1) or visible (0). */
    hidden?: number;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state_code?: string;
    zip_code?: string;
    country_code?: string;
    creation_date?: string;
    /** Whether the program is approved (1) or pending (0). */
    approved?: number;
    tags?: ProgramTag[];
    // allow arbitrary keys for use by controls (e.g. display colors attached by callers)
    [x: string]: any;
}
