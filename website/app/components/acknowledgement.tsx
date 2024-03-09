import { styled } from '../../styled-system/jsx'

export function Acknowledgement() {
    return (
        <styled.section position="relative" bg="white" w="100%" display="flex">
            <styled.div w="100%" position="relative" maxW="1200px" m="0 auto">
                <styled.div w="100%" position="relative" p="6">
                    <styled.p fontSize="sm">
                        We acknowledge the Whadjuk Nyoongar people as the Traditional Owners of the lands and waters
                        where Perth city is situated today, and pay our respect to Elders past and present.
                    </styled.p>
                </styled.div>
            </styled.div>
        </styled.section>
    )
}
