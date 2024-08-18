import { useState } from 'react'
import { css } from '../../../styled-system/css'
import { Box, styled } from '../../../styled-system/jsx'
import { AppLink } from '../app-link.js'

export interface MenuItem {
    title: string
    type: string
    link: string
    subPages?: MenuItem[]
}

export function DesktopLinks({ menuData }: { menuData: MenuItem[] }) {
    const [activeIndex, setActiveIndex] = useState(0)

    return (
        <>
            {activeIndex > 0 ? (
                <Box
                    w="100%"
                    h="100%"
                    minH="100dvh"
                    inset="0"
                    position="absolute"
                    opacity="0"
                    zIndex="9"
                    onClick={() => setActiveIndex(0)}
                />
            ) : null}
            <Box
                w="100%"
                h="100%"
                display="flex"
                position="relative"
                flexDir="row"
                justifyContent="center"
                alignItems="center"
                mr="2"
                lg={{ mr: '3' }}
                xl={{ mr: '4' }}
                zIndex="10"
            >
                {menuData.map((item, index) =>
                    item.subPages ? (
                        <DesktopButton
                            item={item}
                            index={index + 1}
                            key={index}
                            activeIndex={activeIndex}
                            setActiveIndex={setActiveIndex}
                        />
                    ) : (
                        <Box py="5" key={index}>
                            <a
                                href={item.link}
                                className={`desktop-link ${css({ px: '5', lg: { px: '6' }, xl: { px: '8' }, py: '4', cursor: 'pointer', fontFamily: 'display', fontWeight: 'semibold', color: '2023-gray', transition: 'colors', _hover: { color: '2023-green' }, _active: { color: '2023-green' }, _focus: { ring: '1', ringColor: '2023-green' } })}`}
                            >
                                {item.title}
                            </a>
                        </Box>
                    ),
                )}
            </Box>
        </>
    )
}

function DropdownButton({ subPage, style }: { subPage: MenuItem; style: 'parent' | 'child' }) {
    return (
        <Box w="100%" display="flex" flexDir="column" px="2" py="2" bg={style === 'parent' ? 'white' : '2023-white-ii'}>
            <AppLink
                to={subPage.link}
                w="100%"
                px="3"
                lg={{ px: '4' }}
                fontFamily="body"
                color="2023-gray"
                fontSize="base"
                fontWeight="medium"
                transition="colors"
                _hover={{ color: '2023-black' }}
                _active={{ color: '2023-black' }}
                _focus={{ ring: '1', ringColor: '2023-green' }}
                py={style === 'parent' ? '2' : '1'}
            >
                {subPage.title}
            </AppLink>
        </Box>
    )
}

export function DesktopButton({
    item,
    index,
    activeIndex,
    setActiveIndex,
}: {
    item: MenuItem
    index: number
    activeIndex: number
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>
}) {
    const buttonToggle = () => {
        if (activeIndex === index) {
            setActiveIndex(0)
        } else {
            setActiveIndex(index)
        }
    }

    return (
        <Box
            w="auto"
            position="relative"
            py="5"
            className={
                index === activeIndex
                    ? css({ outline: '1px', outlineColor: '2023-gray-light-ii', outlineStyle: 'solid' })
                    : ''
            }
        >
            <styled.button
                display="flex"
                flexDir="row"
                justifyContent="center"
                alignItems="center"
                px={3}
                py={2}
                cursor="pointer"
                transition="colors"
                _hover={{ color: '2023-green' }}
                _active={{ color: '2023-green' }}
                _focus={{ ring: '1', ringColor: '2023-green' }}
                className={
                    index === activeIndex
                        ? css({ fontWeight: 'bold', color: '2023-black' })
                        : css({ fontWeight: 'semibold', color: '2023-gray' })
                }
                onClick={buttonToggle}
            >
                {item.title}
            </styled.button>
            {index === activeIndex ? (
                <Box
                    position="absolute"
                    w="56"
                    bg="white"
                    top="24"
                    display="flex"
                    flexDir="column"
                    justifyContent="flex-start"
                    alignItems="flex-start"
                    border="1px"
                    borderColor="2023-gray-light-ii"
                    borderStyle="solid"
                    roundedBottom="10px"
                    overflow="hidden"
                >
                    {/* Parent Link */}
                    <DropdownButton subPage={item} style={`parent`} />

                    {/* Children Links */}
                    <Box
                        w="100%"
                        display="flex"
                        flexDir="column"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        py="2"
                        bg="2023-white-ii"
                    >
                        {item.subPages?.map((subPage, index) => (
                            <DropdownButton subPage={subPage} style={`child`} key={index} />
                        ))}
                    </Box>
                </Box>
            ) : null}
        </Box>
    )
}
