#!/usr/bin/env node

/**
 * GitHub App setup tool for DDD Perth admin authentication.
 *
 * Starts a local web server that walks you through GitHub's app-manifest flow
 * and writes the resulting OAuth credentials into the right place:
 *
 *   - "local"      → website/.dev.vars
 *   - "staging"    → wrangler secret put ... --env staging
 *   - "production" → wrangler secret put ... --env production
 *
 * The Worker only needs WEBSITE_GITHUB_APP_CLIENT_ID and
 * WEBSITE_GITHUB_APP_CLIENT_SECRET — see app/lib/auth.server.ts.
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { colors, print } from './lib/cli.ts'
import { createServer } from './lib/server.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = join(__dirname, '..', '..')

const DEFAULT_PORT = 3333

interface ParsedArgs {
    port: number
    help?: boolean
}

function showHelp(): void {
    console.log('GitHub App Setup')
    console.log('================')
    console.log('')
    console.log('Starts a local server that helps you create a GitHub App via the manifest flow')
    console.log('and saves the resulting OAuth credentials for the chosen environment.')
    console.log('')
    console.log('Usage: node scripts/setup-github-app/index.ts [options]')
    console.log('   or: pnpm setup:github-app [-- options]')
    console.log('')
    console.log('Options:')
    console.log(`  --port <number>   Port to listen on (default: ${DEFAULT_PORT})`)
    console.log('  --help, -h        Show this help')
    console.log('')
    console.log('After it starts, open the printed URL, pick an environment (local/staging/production),')
    console.log('and click through. For staging/production you must already be authenticated to wrangler')
    console.log('(CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID) and the worker must already exist.')
}

function parseArgs(argv: string[]): ParsedArgs {
    const args: ParsedArgs = { port: DEFAULT_PORT }
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        switch (arg) {
            case '--port': {
                const next = argv[++i]
                const parsed = Number.parseInt(next, 10)
                if (Number.isNaN(parsed)) {
                    print.error(`Invalid port: ${next}`)
                    process.exit(1)
                }
                args.port = parsed
                break
            }
            case '--help':
            case '-h':
                args.help = true
                break
            default:
                if (arg.startsWith('-')) {
                    print.error(`Unknown option: ${arg}`)
                    print.info("Run 'pnpm setup:github-app -- --help' for usage")
                    process.exit(1)
                }
        }
    }
    return args
}

function main(): void {
    const args = parseArgs(process.argv.slice(2))

    if (args.help) {
        showHelp()
        return
    }

    const server = createServer({ repoRoot })

    server.listen(args.port, () => {
        console.log()
        print.success('GitHub App setup server started')
        print.info(`Open ${colors.blue}http://localhost:${args.port}${colors.reset} to begin`)
        print.warning('Press Ctrl+C to stop')
        console.log()
    })

    process.on('SIGINT', () => {
        console.log()
        print.info('Shutting down')
        server.close(() => process.exit(0))
    })
}

main()
