import type { ComponentProps } from 'react'
import { cva } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

/**
 * Image used inside MDX prose.
 *
 * Content picks a size by name (`<img size="portrait" />`) rather than
 * writing dimensions. PandaCSS only scans `app/routes` and `app/components`,
 * so a style prop written in `conference/content/` generates no CSS, and
 * `strictTokens` rejects raw values like `150px` regardless. Defining the
 * variants here keeps them themeable, responsive, and overridable — none of
 * which the inline `style={{ width: '150px' }}` they replace could be.
 *
 * `cva` rather than a lookup object because Panda extracts styles
 * statically: a dynamically spread style object produces no CSS at all.
 */
const mdxImage = cva({
    base: {
        height: 'auto',
        rounded: 'lg',
    },
    variants: {
        size: {
            /**
             * Fills the content column but never exceeds the image's natural
             * width — `maxWidth`, not `width`, so a small image isn't
             * upscaled and blurred.
             */
            full: { maxWidth: 'full' },
            /**
             * Headshot, e.g. the team page. Narrows on small screens; the
             * fixed inline `150px` it replaces could not respond at all.
             * Bracket syntax because there's no size token at these widths.
             */
            portrait: { width: { base: '[100px]', md: '[150px]' }, flexShrink: '0' },
        },
    },
    defaultVariants: { size: 'full' },
})

type MdxImageProps = Omit<ComponentProps<typeof styled.img>, 'width' | 'height'> & {
    size?: 'full' | 'portrait'
}

export function MdxImage({ ref, size, className, ...props }: MdxImageProps) {
    return <styled.img loading="lazy" className={`${mdxImage({ size })} ${className ?? ''}`.trim()} {...props} />
}
