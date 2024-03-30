/* eslint-disable @typescript-eslint/no-unused-vars */
import { MDXContent } from 'mdx/types'
import { renderToStaticMarkup } from 'react-dom/server'
import { styled } from '../../styled-system/jsx'
import { conferenceConfig } from '../config/conference-config'

export function renderMdx(Component: MDXContent): string {
    return renderToStaticMarkup(
        <Component
            components={{
                a: ({ ref, ...props }) => <styled.a {...props} />,
                h1: ({ ref, ...props }) => <styled.h1 fontSize="3xl" {...props} />,
                h2: ({ ref, ...props }) => <styled.h2 fontSize="2xl" {...props} />,
                h3: ({ ref, ...props }) => <styled.h3 fontSize="xl" {...props} />,
                ul: ({ ref, ...props }) => <styled.ul {...props} listStyle="inside" />,
            }}
            conference={conferenceConfig}
        />,
    )
}
