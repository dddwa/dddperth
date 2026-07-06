import { css } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

const skipLinkStyles = css({
    bg: 'black',
    color: 'white',
    left: '4',
    textDecoration: 'none',
    top: '4',
    transition: 'transform',
    zIndex: '9999',
    borderWidth: '0',
    h: '[1px]',
    m: '[-1px]',
    opacity: '0',
    overflow: 'hidden',
    p: '0',
    position: 'absolute',
    transform: '[translateY(-3rem)]',
    whiteSpace: 'nowrap',
    w: '[1px]',
    clipPath: '[inset(50%)]',
    _focus: {
        clipPath: 'none',
        margin: 'auto',
        opacity: '1',
        p: '4',
        position: 'fixed',
        transform: '[translateY(0)]',
        w: 'auto',
        h: 'auto',
    },
})

export function SkipToContent() {
    return (
        <>
            <styled.a id="skip-to-content" href="#main" className={skipLinkStyles}>
                Skip to content
            </styled.a>
            <styled.a
                id="skip-to-header"
                href="#header"
                display="none"
                md={{ display: 'block' }}
                className={skipLinkStyles}
            >
                Skip to Navigation
            </styled.a>
            <styled.a
                id="skip-to-navigation"
                href="#navigation"
                display="block"
                md={{ display: 'none' }}
                className={skipLinkStyles}
            >
                Skip to Navigation
            </styled.a>
        </>
    )
}
