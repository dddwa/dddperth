import { css } from '../../../styled-system/css'
import { Box } from '../../../styled-system/jsx'
import { menuData } from '../../lib/menu'
import { AppLink } from '../app-link'

export function MenuFlyout({ close }: { close: () => void }) {
    return (
        <>
            <Box
                className="click-catch-wrapper"
                w="100%"
                h="100%"
                minH="calc(100dvh - 5rem)"
                top="5rem"
                position="absolute"
                inset="0"
                bg="black"
                opacity="0.75"
                onClick={() => close()}
            />
            <Box
                className="navigation-wrapper"
                w="100%"
                h="auto"
                minH="calc(100dvh - 5rem)"
                top="5rem"
                position="absolute"
                bg="2023-black"
                zIndex="100"
            >
                <Box className="padding-wrapper" w="100%" p="6">
                    <Box
                        className="content-wrapper"
                        w="100%"
                        display="grid"
                        gridTemplateColumns="repeat(1, minmax(0, 1fr))"
                        gap="6"
                    >
                        {menuData.map((item, index) => (
                            <Box key={index} className={getOrder(index)} w="100%" display="flex" flexDir="column">
                                <AppLink
                                    to={item.link}
                                    className="top-level-link"
                                    fontFamily="display"
                                    color="white"
                                    fontSize="2xl"
                                    fontWeight="semibold"
                                    p="2"
                                >
                                    {item.title}
                                </AppLink>
                                {item.subPages ? (
                                    <Box className="submenu-wrapper" w="100%" display="flex" flexDir="column">
                                        {item.subPages.map((subPage, index) => (
                                            <Box
                                                key={index}
                                                className="submenu-items"
                                                w="100%"
                                                display="flex"
                                                flexDir="column"
                                            >
                                                <AppLink
                                                    to={subPage.link}
                                                    className="top-level-link"
                                                    px="2"
                                                    py="3"
                                                    fontFamily="body"
                                                    color="2023-gray-light"
                                                    fontSize="lg"
                                                    fontWeight="medium"
                                                >
                                                    {subPage.title}
                                                </AppLink>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : null}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>
        </>
    )
}

function getOrder(index: number) {
    switch (index) {
        case 0:
            return css({ xs: { order: 1 } })
        case 1:
            return css({ xs: { order: 3 } })
        case 2:
            return css({ xs: { order: 2 } })
        case 3:
            return css({ xs: { order: 4 } })
        case 4:
            return css({ xs: { order: 5 } })
        default:
            return css({ xs: { order: 0 } })
    }
}
