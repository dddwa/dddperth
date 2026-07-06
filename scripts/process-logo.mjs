#!/usr/bin/env node

/**
 * CLI to generate light/dark sponsor logo variants.
 *
 * Usage:
 *     node scripts/process-logo.mjs <input-file> <year> <slug> [--out-dir <dir>]
 *
 * Writes <year>-<slug>-light.<ext> and <year>-<slug>-dark.<ext> into <out-dir>
 * (default: website/public/images/sponsors).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dataUrlToBuffer, processLogo } from './lib/process-logo.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUT_DIR = path.join(__dirname, '..', 'website', 'public', 'images', 'sponsors')

function parseArgs(argv) {
    const positional = []
    const opts = { outDir: DEFAULT_OUT_DIR }
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--out-dir') {
            opts.outDir = argv[++i]
        } else if (a === '--help' || a === '-h') {
            opts.help = true
        } else {
            positional.push(a)
        }
    }
    return { positional, opts }
}

function usage() {
    console.error('Usage: process-logo.mjs <input-file> <year> <slug> [--out-dir <dir>]')
}

const { positional, opts } = parseArgs(process.argv.slice(2))
if (opts.help || positional.length < 3) {
    usage()
    process.exit(opts.help ? 0 : 1)
}

const [inputPath, year, slug] = positional
const ext = path.extname(inputPath).toLowerCase().slice(1) || 'png'
const variantExt = ext === 'svg' ? 'svg' : 'png'
const buffer = readFileSync(inputPath)

const result = await processLogo(buffer, inputPath)
if (!result.success) {
    console.error(`processLogo failed: ${result.error}`)
    process.exit(1)
}

const lightPath = path.join(opts.outDir, `${year}-${slug}-light.${variantExt}`)
const darkPath = path.join(opts.outDir, `${year}-${slug}-dark.${variantExt}`)

writeFileSync(lightPath, dataUrlToBuffer(result.light))
writeFileSync(darkPath, dataUrlToBuffer(result.dark))

console.log(`wrote ${lightPath}`)
console.log(`wrote ${darkPath}`)
