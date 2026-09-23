// Node 26 strips types on import, so the scripts share the core config
// package's tier declarations directly rather than keeping their own copies.
// Those copies had all drifted: each was missing `venue` and `prize`, and
// `add-sponsor.mjs` carried a `lunch` tier no year config has ever used
// (sponsors have spoken over lunch, but that's a presenter slot, not a tier).
export { MAJOR_SPONSOR_TIERS, MINOR_SPONSOR_TIERS, SPONSOR_TIERS } from '../../core/libs/conference-config/src/types.ts'

import { MINOR_SPONSOR_TIERS } from '../../core/libs/conference-config/src/types.ts'

/** Title-cased label for a tier, for CLI prompts and the web UI's <option>s. */
export function tierLabel(tier) {
    const minor = MINOR_SPONSOR_TIERS.find((t) => t.tier === tier)
    if (minor) return minor.defaultLabel
    return tier.charAt(0).toUpperCase() + tier.slice(1)
}
