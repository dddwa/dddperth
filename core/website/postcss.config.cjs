// Resolving the postcss plugin via `require.resolve` from this file's
// location avoids a workerd-sandboxed import resolution that, in dev mode
// (cloudflare vite plugin's SSR-in-worker environment), tries to load
// pandacss from a stale pnpm peer-hash path that doesn't exist on disk.
// Pre-resolving here pins the plugin to whatever this file's node_modules
// graph sees, which always matches what `pnpm i` installed.
const pandacssPostcss = require('@pandacss/dev/postcss')

module.exports = {
    plugins: [pandacssPostcss()],
}
