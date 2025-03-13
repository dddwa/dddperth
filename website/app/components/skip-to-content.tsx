import { css } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'

const commonLinkStyles = css({
    bg: 'black',
    border: '0',
    color: 'white',
    left: '4',
    outline: 'none',
    textDecoration: 'none',
    top: '4',
    transition: 'transform',
    zIndex: '9999',
    borderWidth: '0',
    clip: 'rect(0,0,0,0)',
    h: '1px',
    m: '-1px',
    opacity: '0',
    overflow: 'hidden',
    p: '0',
    position: 'absolute',
    transform: 'translateY(-3rem)',
    whiteSpace: 'nowrap',
    w: '1px',
    _focus: {
        clip: 'unset',
        h: 'auto',
        m: 'auto',
        opacity: '100',
        p: '1rem 1.5rem',
        position: 'fixed',
        transform: 'translateY(0)',
        w: 'auto',
    },
})

export function SkipToContent() {
    return (
        <>
            <styled.a id="skip-to-content" href="#main" className={commonLinkStyles}>
                Skip to content
            </styled.a>
            <styled.a
                id="skip-to-header"
                href="#header"
                display="none"
                md={{ display: 'block' }}
                className={commonLinkStyles}
            >
                Skip to Navigation
            </styled.a>
            <styled.a
                id="skip-to-navigation"
                href="#navigation"
                display="block"
                md={{ display: 'none' }}
                className={commonLinkStyles}
            >
                Skip to Navigation
            </styled.a>
        </>
    )
}
