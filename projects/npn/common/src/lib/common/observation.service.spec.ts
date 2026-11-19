import { normalizeRowKeys } from './observation.service';

describe('normalizeRowKeys', () => {
    it('lowercases legacy PascalCase keys', () => {
        expect(normalizeRowKeys({ First_Yes_DOY: 120, Individual_ID: 7 }))
            .toEqual({ first_yes_doy: 120, individual_id: 7 });
    });

    it('leaves today\'s climate names alone', () => {
        expect(normalizeRowKeys({ gdd: 10, acc_prcp: 3 })).toEqual({ gdd: 10, acc_prcp: 3 });
    });

    it('adds the legacy spelling for renamed climate columns', () => {
        expect(normalizeRowKeys({ agdd: 10, agdd_in_f: 50, tmax_in_f: 80, tmin_in_f: 40, accum_prcp: 3 }))
            .toEqual({
                agdd: 10, gdd: 10,
                agdd_in_f: 50, gddf: 50,
                tmax_in_f: 80, tmaxf: 80,
                tmin_in_f: 40, tminf: 40,
                accum_prcp: 3, acc_prcp: 3
            });
    });

    it('keeps site-level mean_* climate names unaliased', () => {
        expect(normalizeRowKeys({ mean_agdd: 10, mean_accum_prcp: 3 }))
            .toEqual({ mean_agdd: 10, mean_accum_prcp: 3 });
    });

    it('adds the hyphenated spelling the activity curves read for in_phase columns', () => {
        expect(normalizeRowKeys({
            total_numanimals_in_phase: 4,
            in_phase_per_hr_per_acre_sites_sample_size: 2
        })).toEqual({
            total_numanimals_in_phase: 4,
            'total_numanimals_in-phase': 4,
            in_phase_per_hr_per_acre_sites_sample_size: 2,
            'in-phase_per_hr_per_acre_sites_sample_size': 2
        });
    });

    it('lowercases today\'s hyphenated magnitude names unchanged', () => {
        expect(normalizeRowKeys({ 'Mean_NumAnimals_In-Phase': 1.5 }))
            .toEqual({ 'mean_numanimals_in-phase': 1.5 });
    });
});
