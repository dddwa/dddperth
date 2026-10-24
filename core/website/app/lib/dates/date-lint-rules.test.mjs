import ts from 'typescript-eslint'
import path from 'node:path'
import { Linter, RuleTester } from 'eslint'
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
    ].map((code) => ({ code, errors: [{ messageId: 'useHelper' }] })),
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
    ],
    invalid: [
        'new Date(epoch).getDay();',
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
const a = conferenceTime('2026-10-03T09:00'); const b = a.add({ hours: 1 }); ${expression}`,
})
typedTester.run('no-temporal-coercion', plugin.rules['no-temporal-coercion'], {
    valid: [typedCase('Temporal.ZonedDateTime.compare(a, b) < 0; a.epochMilliseconds - b.epochMilliseconds;')],
    invalid: ['a < b;', 'a - b;', '+a;'].map((expression) => ({ ...typedCase(expression), errors: [{ messageId: 'compare' }] })),
})
