import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The containerised visual suite pins a Playwright Docker image (see the
 * `visual-regression` job in .github/workflows/pr.yml and `pnpm vr`). If that
 * tag drifts from the installed @playwright/test version, the browser build
 * in CI stops matching the one that generated the baselines — reintroducing
 * exactly the cross-environment drift the container exists to eliminate, and
 * doing it silently, as unexplained pixel diffs.
 */
describe('Playwright container image pin', () => {
    const websiteRoot = join(__dirname, '..', '..')

    /**
     * CI workflows are fork-owned — `ddd-core` ships no `.github/workflows/`,
     * so there is no pin to check when running standalone. A fork runs from
     * `core/website/` with the workflows two levels up.
     */
    const workflowPath = [
        join(websiteRoot, '..', '..', '.github', 'workflows', 'pr.yml'),
        join(websiteRoot, '..', '.github', 'workflows', 'pr.yml'),
    ].find((candidate) => existsSync(candidate))

    it.skipIf(!workflowPath)('matches the image tag used by the visual-regression CI job', () => {
        // Non-null: skipIf above guarantees this ran only when the path resolved.
        const version = (
            JSON.parse(
                readFileSync(join(websiteRoot, 'node_modules/@playwright/test/package.json'), 'utf8'),
            ) as { version: string }
        ).version

        const workflow = readFileSync(workflowPath as string, 'utf8')
        const match = /image:\s*mcr\.microsoft\.com\/playwright:v([\d.]+)-noble/.exec(workflow)

        expect(match, 'no Playwright image pin found in .github/workflows/pr.yml').toBeTruthy()
        expect(
            match?.[1],
            `CI image tag v${match?.[1]} does not match installed @playwright/test ${version}. ` +
                'Update the image tag in pr.yml, then regenerate baselines with `pnpm vr --update-snapshots`.',
        ).toBe(version)
    })
})
