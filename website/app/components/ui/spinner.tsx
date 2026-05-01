import { forwardRef } from 'react'
import { css, cx } from '~/styled-system/css'
import { styled } from '~/styled-system/jsx'
import { Spinner as StyledSpinner, type SpinnerProps as StyledSpinnerProps } from './styled/spinner'

export interface SpinnerProps extends StyledSpinnerProps {
    /**
     * For accessibility, it is important to add a fallback loading text.
     * This text will be visible to screen readers.
     * @default "Loading..."
     */
    label?: string
}

const transparentBordersClass = css({
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
})

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>((props, ref) => {
    const { label = 'Loading...', className, ...rest } = props

    return (
        <StyledSpinner ref={ref} {...rest} className={cx(transparentBordersClass, className)}>
            {label && <styled.span srOnly>{label}</styled.span>}
        </StyledSpinner>
    )
})

Spinner.displayName = 'Spinner'
