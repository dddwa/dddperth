import { styled } from '../../../styled-system/jsx'

export function MenuButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
    return (
        <styled.button
            id="navigation"
            onClick={onClick}
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
