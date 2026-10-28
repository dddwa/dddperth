import ts from 'typescript-eslint'
import path from 'node:path'
import { ESLint, Linter, RuleTester } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../../../../eslint-rules/date-time.mjs'

RuleTester.describe = describe
RuleTester.it = it
const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } })

tester.run('use-conference-date-time', plugin.rules['use-conference-date-time'], {
    valid: [
        "import { conferenceTime } from './temporal'; conferenceTime(value);",
        "import { Temporal } from './temporal'; Temporal.PlainTime.from('09:00');",
    ],
    invalid: [
        "import { DateTime } from 'luxon'; DateTime.DATE_MED;",
        "import { DateTime as DT } from 'luxon'; DT.fromISO(value, { zone: 'UTC' });",
        "import * as luxon from 'luxon'; luxon.DateTime.fromSeconds(value);",
        "import { Duration } from 'luxon'; Duration.fromISO('P1D');",
        "Temporal.PlainDate.from(value);",
        "globalThis.Temporal.PlainDate.from(value);",
        "import { Temporal as T } from 'temporal-polyfill'; T.PlainDate.from(value);",
        "import 'temporal-polyfill/global';",
        "await import('temporal-polyfill');",
        "await import('temporal-polyfill/implementation');",

    ].map((code) => ({ code, errors: [{ messageId: 'useHelper' }] })),
})

const deferredConfig = { options: [{ deferConstruction: true }] }
tester.run('deferred config dates', plugin.rules['use-conference-date-time'], {
    valid: [
        { ...deferredConfig, code: "import { conferenceTime } from './dates.ts'; const config = { get conferenceDate() { return conferenceTime('2026-10-03T09:00') } };" },
        { ...deferredConfig, code: "import { Temporal } from './temporal'; function day() { return Temporal.PlainDate.from('2026-10-03') }" },
        { ...deferredConfig, code: "function conferenceTime(value) { return value }; conferenceTime('unrelated');" },
    ],
    invalid: [
        "import { conferenceTime } from './dates.ts'; const config = { conferenceDate: conferenceTime('2026-10-03T09:00') };",
        "import { conferenceTime as at } from './dates.ts'; const date = at('2026-10-03T09:00');",
        "import * as dates from './dates.ts'; const date = dates.conferenceTime('2026-10-03T09:00');",
        "import { Temporal } from './temporal'; const day = Temporal.PlainDate.from('2026-10-03');",
    ].map((code) => ({ ...deferredConfig, code, errors: [{ messageId: 'deferConstruction' }] })),
})

tester.run('use-date-time-provider', plugin.rules['use-date-time-provider'], {
    valid: [
        'clock.now(); clock.nowDate();',
        'function f(Temporal) { return Temporal.Now.instant(); }',
        'new Date(epochMillis);',
        'function f(Date) { return Date.now(); }',
        "import { DateTime } from 'luxon'; function f(DateTime) { return DateTime.now(); }",
    ],
    invalid: [
        'Temporal.Now.instant();',
        'globalThis.Temporal.Now.instant();',
        'window.Temporal.Now.instant();',
        'globalThis.Date.now();',
        'new globalThis.Date();',
        "import { Temporal as T } from 'temporal-polyfill'; T.Now.instant();",
        "import * as time from './temporal'; time.Temporal.Now.zonedDateTimeISO();",
        'Date.now();', 'const now = Date["now"];', 'new Date();', 'Date();', 'Date(123);',
        "import { DateTime as DT } from 'luxon'; DT.now();",
        "import * as luxon from 'luxon'; luxon.DateTime.local();",
        "import { DateTime } from 'luxon'; DateTime.utc();",
    ].map((code) => ({ code, errors: [{ messageId: 'useProvider' }] })),
})

tester.run('no-native-date-calendar', plugin.rules['no-native-date-calendar'], {
    valid: [
        'new Date(epoch).toISOString();',
        'const date = new Date(epoch); date.getTime();',
        "const date = new Date(epoch); date.toLocaleDateString('en-AU', { timeZone: 'Australia/Perth' });",
        'list.toLocaleString();',
        'function f(Date) { return new Date(2026, 9, 3); }',
    ],
    invalid: [
        'new Date(epoch).getDay();',
        'new Date(2026, 9, 3);',
        'new globalThis.Date(2026, 9, 3);',
        'const date = new Date(epoch); date.setDate(1);',
        "const date = new Date(epoch); date.toLocaleDateString('en-AU');",
    ].map((code) => ({ code, errors: [{ messageId: 'useTemporal' }] })),
})

it('allows a documented operational-clock exception', () => {
    const messages = new Linter().verify(
        '// eslint-disable-next-line dates/use-date-time-provider -- actual audit write time\nDate.now()',
        [{ plugins: { dates: plugin }, rules: { 'dates/use-date-time-provider': 'error' } }],
    )
    expect(messages).toEqual([])
})

const typedTester = new RuleTester({
    languageOptions: {
        parser: ts.parser,
        parserOptions: {
            projectService: { allowDefaultProject: ['date-rule-fixture.ts'] },
            tsconfigRootDir: process.cwd(),
        },
    },
})
const typedCase = (expression) => ({
    filename: path.join(process.cwd(), 'date-rule-fixture.ts'),
    code: `import { conferenceTime, Temporal } from './app/lib/dates/temporal';
let a = conferenceTime('2026-10-03T09:00'); const b = a.add({ hours: 1 }); ${expression}`,
})
typedTester.run('no-temporal-coercion', plugin.rules['no-temporal-coercion'], {
    valid: [
        typedCase('Temporal.ZonedDateTime.compare(a, b) < 0; a.epochMilliseconds - b.epochMilliseconds;'),
        typedCase('a === b; String(a); `${a}`; let millis = a.epochMilliseconds; millis += 1; millis++;'),
    ],
    invalid: ['a < b;', 'a - b;', '+a;', 'a += b;', 'a++;', 'a | 0;', '0 - a;'].map((expression) => ({ ...typedCase(expression), errors: [{ messageId: 'compare' }] })),
})

// Check the shipped configurations as well as the rules: an unregistered rule
// silently leaves conference config outside the application enforcement.
it.each([
    ['../../../../..', 'conference/config/years/2026.ts'],
    ['../../../..', 'conference-stub/config/years/2026.ts'],
    ['../../..', 'app/lib/conference-state.server.ts'],
])('enforces the date contract in %s/%s', async (root, file) => {
    const cwd = path.resolve(import.meta.dirname, root)
    const eslint = new ESLint({ cwd, overrideConfigFile: path.join(cwd, 'eslint.config.mjs') })
    const config = await eslint.calculateConfigForFile(path.join(cwd, file))
    for (const rule of Object.keys(plugin.rules)) {
        expect(config.rules[`dates/${rule}`][0]).toBe(2)
    }
    expect(config.languageOptions.parserOptions.projectService).toBe(true)
    // The reference conference is excluded from a fork's pnpm workspace, so
    // resolve the shared implementation directly for this synthetic fixture.
    const dates = path.relative(path.dirname(path.join(cwd, file)), path.resolve(import.meta.dirname, '../../../../libs/conference-config/src/dates.ts'))
    const [result] = await eslint.lintText(`
        import { Temporal } from '${dates}';
        import 'luxon';
        function example() {
            const day = Temporal.PlainDate.from('2026-10-03');
            day < day;
            Date.now();
            new Date(2026, 9, 3);
        }
    `, { filePath: path.join(cwd, file) })
    expect(result.messages.filter((message) => message.ruleId?.startsWith('dates/')).map((message) => message.ruleId).sort())
        .toEqual(Object.keys(plugin.rules).map((rule) => `dates/${rule}`).sort())
})

typedTester.run('no-temporal-coercion across Temporal types', plugin.rules['no-temporal-coercion'], {
    valid: [typedCase('const count = a.day; count < 4;')],
    invalid: ['Instant', 'PlainDate', 'PlainDateTime', 'PlainTime', 'PlainYearMonth', 'PlainMonthDay', 'Duration']
        .map((type) => ({
            ...typedCase(`declare const value: Temporal.${type} | undefined; value < 0;`),
            errors: [{ messageId: 'compare' }],
        })),
})
