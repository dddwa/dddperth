/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.mdx' {
    let MDXComponent: (props: any) => JSX.Element
    export const frontmatter: any
    export default MDXComponent
}

declare module 'virtual:mdx-bundles' {
    import type { ComponentType } from 'react'
    export interface MdxBundleModule {
        default: ComponentType<any>
        frontmatter: Record<string, unknown>
    }
    export interface MdxBundleEntry {
        frontmatter: Record<string, unknown>
        load: () => Promise<MdxBundleModule>
        code: () => Promise<string>
    }
    const bundles: {
        page: Record<string, MdxBundleEntry>
        blog: Record<string, MdxBundleEntry>
    }
    export default bundles
}
