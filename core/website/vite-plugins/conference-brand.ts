import path from 'node:path'
import type { BrandAssets } from '@ddd/conference-config'
import { searchForWorkspaceRoot, type Plugin } from 'vite'

// The logo and hero marks are imported as `?react` components, so they are
// compiled into the bundle and the `conference-public` URL overlay can't
// replace them. Before this plugin they lived in core/website/app/images/,
// and every fork had to overwrite them inside core/ — which then conflicted
// on `git subtree pull`.
//
// `virtual:conference-brand` re-exports the fork's files through the same
// `?react` query, so svgr (registered separately in vite.config.ts) still
// does the compiling and call sites only change their import specifier.

const ID = 'virtual:conference-brand'
const RESOLVED = '\0virtual:conference-brand'

export function conferenceBrandPlugin(brandAssets: BrandAssets): Plugin {
    const svgImport = (file: string) => JSON.stringify(`${path.resolve(file)}?react`)

    return {
        name: 'dddperth:conference-brand',

        // A fork's brand files sit in conference/, outside the core/ workspace
        // that Vite allows by default, and vitest has no fork override to widen
        // it. Setting `fs.allow` switches off Vite's workspace-root default, so
        // keep that root in the list too; Vite concatenates it with any allow
        // list vite.config.ts sets.
        config(config) {
            const root = config.root ?? process.cwd()
            const brandDirs = [brandAssets.logo, ...brandAssets.heroMarks].map((file) => path.dirname(path.resolve(file)))
            return { server: { fs: { allow: [searchForWorkspaceRoot(root), ...new Set(brandDirs)] } } }
        },

        resolveId(id) {
            if (id === ID) return RESOLVED
        },

        load(id) {
            if (id !== RESOLVED) return
            return [
                `import Logo from ${svgImport(brandAssets.logo)}`,
                ...brandAssets.heroMarks.map((file, i) => `import HeroMark${i} from ${svgImport(file)}`),
                `export { Logo }`,
                `export const heroMarks = [${brandAssets.heroMarks.map((_, i) => `HeroMark${i}`).join(', ')}]`,
            ].join('\n')
        },
    }
}
