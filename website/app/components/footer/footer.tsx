import LogoStandard2023 from '~/images/svg/logo-standard-2023.svg?react'
import { css } from '../../../styled-system/css'
import { styled } from '../../../styled-system/jsx'
import { conferenceConfig } from '../../config/conference-config'
import { menuData } from '../../config/menu'
import { socialsData } from '../../config/socials-data'
import { ctaButton } from '../../recipes/button'

export function Footer() {
    return (
        <styled.footer
            className={`global-footer`}
            position="relative"
            bg="2023-black"
            w="100%"
            display="flex"
            zIndex="10"
        >
            <styled.div className={`container-wrapper`} w="100%" position="relative" maxW="1200px" m="0 auto">
                <styled.div
                    className={`grid-wrapper`}
                    w="100%"
                    position="relative"
                    display="flex"
                    flexDir="column"
                    justifyContent="flex-start"
                    alignItems="flex-start"
                >
                    <styled.div
                        className={`header-wrapper`}
                        w="100%"
                        position="relative"
                        display="flex"
                        flexDir="column"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        p="6"
                    >
                        <styled.div
                            className={`left-wrapper`}
                            w="auto"
                            position="relative"
                            display="flex"
                            flexDir="column"
                            justifyContent="flex-start"
                            alignItems="flex-start"
                        >
                            <styled.a
                                aria-label={`Visit the ${conferenceConfig.name} homepage`}
                                href={`/`}
                                display="flex"
                                justifyContent="flex-start"
                                alignItems="center"
                            >
                                <LogoStandard2023 className={css({ w: '24' })} />
                            </styled.a>
                        </styled.div>
                        <styled.div
                            className={`right-wrapper`}
                            w="auto"
                            position="relative"
                            display="flex"
                            flexDir="column"
                            justifyContent="flex-start"
                            alignItems="flex-start"
                            mt="6"
                        >
                            <styled.a href={`mailto:info@dddperth.com`} color="white">
                                info@dddperth.com
                            </styled.a>
                            <styled.a
                                href={`/contact`}
                                className={`${ctaButton({ visual: 'tertiary', size: 'lg', width: 'auto' })}`}
                                mt="4"
                            >
                                Get in touch
                            </styled.a>
                        </styled.div>
                    </styled.div>
                    <styled.div
                        className={`links-wrapper`}
                        w="100%"
                        position="relative"
                        display="grid"
                        gridTemplateColumns="repeat(2,minmax(0,1fr))"
                        pb="6"
                    >
                        <styled.div
                            className={`link-wrapper`}
                            w="100%"
                            display="flex"
                            flexDir="column"
                            justifyContent="flex-start"
                            alignItems="flex-start"
                        >
                            <styled.a
                                href={`/`}
                                className={`${ctaButton({ visual: 'hyperlink', size: 'sm', width: 'full' })}`}
                            >
                                Home
                            </styled.a>
                        </styled.div>
                        {menuData.map((item) => (
                            <styled.div
                                key={item.link}
                                className={`link-wrapper`}
                                w="100%"
                                display="flex"
                                flexDir="column"
                                justifyContent="flex-start"
                                alignItems="flex-start"
                            >
                                <styled.a
                                    href={item.link}
                                    className={`${ctaButton({ visual: 'hyperlink', size: 'sm', width: 'full' })}`}
                                >
                                    {item.title}
                                </styled.a>
                            </styled.div>
                        ))}
                    </styled.div>
                    <styled.div
                        className={`socials-wrapper`}
                        w="100%"
                        position="relative"
                        display="flex"
                        flexDir="row"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        flexWrap="wrap"
                        borderTop="1px solid white"
                        px="4"
                        pt="6"
                    >
                        {socialsData.map((item) => (
                            <styled.div
                                key={item.link}
                                className={`link-wrapper`}
                                w="auto"
                                display="flex"
                                flexDir="column"
                                justifyContent="flex-start"
                                alignItems="flex-start"
                            >
                                <styled.a
                                    aria-label={`Visit us on ${item.title}`}
                                    href={item.link}
                                    target={`_blank`}
                                    rel={`nofollow noopener`}
                                    display="flex"
                                    justifyContent="flex-start"
                                    alignItems="center"
                                >
                                    <item.icon
                                        className={css({
                                            w: '12',
                                            color: '2023-gray-light',
                                            transition: 'colors',
                                            _hover: { color: 'white' },
                                        })}
                                    />
                                </styled.a>
                            </styled.div>
                        ))}
                    </styled.div>
                    <styled.div
                        className={`terms-wrapper`}
                        w="100%"
                        position="relative"
                        display="flex"
                        flexDir="column"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        pt="6"
                    >
                        <styled.a
                            href={`/terms-and-conditions`}
                            className={`${ctaButton({ visual: 'hyperlink', size: 'sm', width: 'full' })}`}
                        >
                            Terms and Conditions
                        </styled.a>
                        <styled.a
                            href={`/privacy-statement`}
                            className={`${ctaButton({ visual: 'hyperlink', size: 'sm', width: 'full' })}`}
                        >
                            Privacy Statement
                        </styled.a>
                    </styled.div>
                    <styled.div
                        className={`copyright-wrapper`}
                        w="100%"
                        position="relative"
                        display="flex"
                        flexDir="column"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        p="6"
                        pb="0"
                        color="2023-gray-light"
                        fontSize="sm"
                    >
                        <p>Copyright © 2023 DDD WA Inc.</p>
                        <styled.p pt="2">ABN 19 622 848 276</styled.p>
                    </styled.div>
                    <styled.div
                        className={`back-to-top-wrapper`}
                        w="100%"
                        position="relative"
                        display="flex"
                        flexDir="column"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        pt="6"
                    >
                        <styled.a
                            href="#header"
                            className={`back-to-top-button`}
                            w="100%"
                            bg="2023-gray"
                            color="white"
                            textAlign="center"
                            px="8"
                            py="4"
                            transition="colors"
                            _hover={{ bg: '2023-red' }}
                        >
                            Back to top
                        </styled.a>
                    </styled.div>
                </styled.div>
            </styled.div>
        </styled.footer>
    )
}
