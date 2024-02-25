import { useState } from 'react'
import { styled } from '../../../styled-system/jsx'

export function MenuButton() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <styled.button
            id="navigation"
            onClick={() => setIsOpen(!isOpen)}
            w="28"
            h="20"
            fontFamily="display"
            fontWeight="semibold"
            position="relative"
            zIndex="101"
            cursor="pointer"
            md={{ display: 'none' }}
        >
            {isOpen ? 'Close' : 'Menu'}
        </styled.button>
    )
}
