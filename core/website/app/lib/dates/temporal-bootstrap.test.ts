import { Linter, type Rule } from 'eslint'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

const noTopLevelAwait: Rule.RuleModule = {
    meta: { schema: [] },
    create(context) {
        return {
            'AwaitExpression, ForOfStatement[await=true]'(node) {
                const insideFunction = context.sourceCode.getAncestors(node).some((ancestor) =>
                    ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(ancestor.type))
                if (!insideFunction) {
                    context.report({ node, message: 'Browser startup must not require top-level await' })
                }
            },
        }
    },
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
})

it('imports conference configuration before initialization, then exposes real Temporal values', async () => {
    vi.stubGlobal('Temporal', undefined)
    vi.resetModules()
    const { conferenceManifest } = await import('@conference/manifest')
    const runtime = await import('./temporal')

    expect(runtime.Temporal).toBeUndefined()
    expect(() => runtime.conferenceDate('2026-10-03')).toThrow('Call initializeTemporal()')
    const first = runtime.initializeTemporal()
    expect(runtime.initializeTemporal()).toBe(first)
    await first

    expect(runtime.conferenceDate('2026-10-03')).toBeInstanceOf(runtime.Temporal.PlainDate)
    const conferences = Object.values(conferenceManifest.conferences.conferences)
    for (const conference of conferences) {
        if (conference.kind !== 'conference' || !conference.conferenceDate) continue
        expect(conference.conferenceDate).toBeInstanceOf(runtime.Temporal.ZonedDateTime)
        expect(conference.conferenceDate.timeZoneId).toBe(conferenceManifest.public.timezone)
    }
    expect(Reflect.get(globalThis, 'Temporal')).toBeUndefined()
})

const client = join(import.meta.dirname, '../../../build/client')
const javascriptFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name)
    return entry.isDirectory() ? javascriptFiles(file) : file.endsWith('.js') ? [file] : []
})

// Dev never tree-shakes, so only the production build shows whether the
// hydrateRoot call survived. Dropping it leaves a page with no interactivity and no error.
it('ships a browser bundle that still hydrates the document', () => {
    const files = javascriptFiles(client)
    expect(files.length, 'Run via nx test website so the production build is supplied').toBeGreaterThan(0)
    const hydrates = files.some((file) => /hydrateRoot\)?\(\s*document\b/.test(readFileSync(file, 'utf8')))
    expect(hydrates, 'hydrateRoot(document, ...) is missing from build/client').toBe(true)
})

it('ships browser modules without top-level await', () => {
    const files = javascriptFiles(client)
    expect(files.length, 'Run via nx test website so the production build is supplied').toBeGreaterThan(0)
    const linter = new Linter()
    const offenders = files.flatMap((file) => linter.verify(readFileSync(file, 'utf8'), [{
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        plugins: {
            bootstrap: {
                rules: {
                    'no-top-level-await': noTopLevelAwait,
                },
            },
        },
        rules: { 'bootstrap/no-top-level-await': 'error' },
    }]).map((message) => ({ file, message: message.message })))
    expect(offenders).toEqual([])
})
