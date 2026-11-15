import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { AppLink } from '~/components/app-link'
import { styled } from '~/styled-system/jsx'

/** The tree `renderEventMarkdown` (server) produces and this renders. */
export type EventMarkdownTree = Parameters<typeof toJsxRuntime>[0]

/**
 * Renders an event description that `renderEventMarkdown` has already parsed
 * and made safe on the server. Uses the same element mapping as the site's
 * MDX content pages, so links get AppLink's new-tab handling and the page
 * reads like any other content page.
 */
export function EventMarkdown({ tree }: { tree: EventMarkdownTree }) {
    return toJsxRuntime(tree, {
        Fragment,
        jsx,
        jsxs,
        components: {
            a: ({ href, ...props }) =>
                href ? <AppLink unstyled to={href} {...props} /> : <styled.span {...props} />,
            h2: (props) => <styled.h2 fontSize="2xl" {...props} />,
            h3: (props) => <styled.h3 fontSize="xl" {...props} />,
            ul: (props) => <styled.ul listStyle="inside" {...props} />,
            // A long line scrolls inside the column rather than widening the
            // page, so keyboard users need focus to scroll it.
            pre: (props) => <styled.pre tabIndex={0} {...props} />,
            img: ({ alt, ...props }) => (
                <styled.img alt={alt ?? ''} loading="lazy" maxW="full" h="auto" {...props} />
            ),
        },
    })
}
