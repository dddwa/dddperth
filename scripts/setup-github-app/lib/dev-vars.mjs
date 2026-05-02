import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * Set or update a key=value entry in a .dev.vars / .env style file.
 * Preserves existing entries and comments. Creates the file if missing.
 */
export function upsertDevVar(filePath, key, value) {
    const line = `${key}=${value}`
    const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : ''
    const pattern = new RegExp(`^${escapeRegex(key)}=.*$`, 'm')

    let next
    if (pattern.test(existing)) {
        next = existing.replace(pattern, line)
    } else {
        const sep = existing.length === 0 || existing.endsWith('\n') ? '' : '\n'
        next = `${existing}${sep}${line}\n`
    }

    writeFileSync(filePath, next)
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
