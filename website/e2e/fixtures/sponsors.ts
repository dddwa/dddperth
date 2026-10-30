/**
 * Synthetic sponsors for the visual baselines.
 *
 * The home page is the one route with no year in its path — it renders
 * whichever conference is current, so its sponsor strip changes every time a
 * sponsor is signed, re-tiered or re-logoed. That made a routine content edit
 * ("add this year's gold sponsor") cost a baseline regeneration across 3
 * engines x 3 viewports, and worse, made it easy to sweep an unreviewed
 * sponsor change into a regeneration done for an unrelated reason.
 *
 * These fixtures pin that input, exactly as `VISUAL_DATE` pins the clock and
 * the Sessionize fixtures pin the agenda. What `/` then covers is the strip's
 * **layout** — two tiers, cell sizing, wrapping, and the surrounding header /
 * nav / footer chrome that only this full-page baseline sees.
 *
 * **Real sponsor content is still covered**, by `/sponsors/2025`: that route
 * is year-pinned, so its config is frozen and its baseline exercises every
 * tier's rendering against real logos.
 *
 * ## Shape choices
 *
 * Two platinum and three gold, because the strip renders those two tiers and
 * nothing else. Gold gets an odd count so the row exercises wrapping rather
 * than landing on a tidy grid at every viewport. The two tiers use different
 * aspect ratios (landscape vs. near-square) so the cells' independent width
 * and height caps both stay under test — a portrait mark that ignores the
 * height cap balloons to several times its neighbours' width.
 *
 * ## Why inline data URIs rather than files in `public/`
 *
 * Everything under `public/` is copied verbatim into the client build, so
 * committed fixture logos would ship to production as dead assets (verified —
 * they appeared in `build/client/`). Inlining keeps them out of the build
 * entirely and keeps each logo beside the sponsor that uses it.
 *
 * They are drawn with `Arial, Helvetica` rather than the site's webfont: the
 * Docker container and a macOS host resolve those identically, so a fixture
 * logo can't reintroduce the font-metric drift the container pin exists to
 * remove.
 */
import type { YearSponsors } from '~/lib/conference-state-client-safe'

/**
 * A framed wordmark as an SVG data URI. `stroke`/`fill` are the only things
 * that vary between the dark and light variants, mirroring how real sponsors
 * supply two colourways of one mark.
 */
function logo(label: string, width: number, height: number, color: string): string {
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
        `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="4" fill="none" stroke="${color}" stroke-width="2"/>` +
        `<text x="${width / 2}" y="${height / 2}" fill="${color}" font-family="Arial, Helvetica, sans-serif" ` +
        `font-size="12" font-weight="bold" text-anchor="middle" dominant-baseline="central">${label}</text>` +
        `</svg>`
    // encodeURIComponent rather than base64: it survives being read in a diff,
    // and workerd has no `btoa` guarantee worth depending on here.
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function fixtureSponsor(label: string, width: number, height: number, lightModeColor: string) {
    return {
        name: label,
        website: 'https://example.com',
        // Dark theme shows the light-on-dark mark, and vice versa.
        logoUrlDarkMode: logo(label, width, height, '#FFFFFF'),
        logoUrlLightMode: logo(label, width, height, lightModeColor),
    }
}

/**
 * The name `visual.spec.ts` looks for to prove the seam applied. Kept beside
 * the data so renaming a fixture sponsor can't leave the assertion checking
 * for a name that no longer exists.
 */
export const FIXTURE_SPONSOR_NAME = 'Fixture A'

export const FIXTURE_SPONSORS: YearSponsors = {
    platinum: [fixtureSponsor('Fixture A', 120, 48, '#4F46E5'), fixtureSponsor('Fixture B', 120, 48, '#0891B2')],
    gold: [
        fixtureSponsor('Fixture C', 100, 40, '#B45309'),
        fixtureSponsor('Fixture D', 100, 40, '#15803D'),
        fixtureSponsor('Fixture E', 64, 56, '#BE185D'),
    ],
}
