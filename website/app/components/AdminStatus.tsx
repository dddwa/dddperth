import { useFetcher, Link } from 'react-router'
import { useEffect } from 'react'
import type { User } from '~/lib/auth.server'
import { Box, Flex } from '~/styled-system/jsx'
import { styled } from '~/styled-system/jsx'

interface AdminStatusProps {
  className?: string
  showAvatar?: boolean
  showLoginButton?: boolean
}

export function AdminStatus({ className = '', showAvatar = true, showLoginButton = true }: AdminStatusProps) {
  const fetcher = useFetcher<{ user: User | null }>()

  useEffect(() => {
    if (fetcher.state === 'idle' && !fetcher.data) {
      void fetcher.load('/api/admin-status')
    }
  }, [fetcher])

  const user = fetcher.data?.user

  if (fetcher.state === 'loading') {
    return (
      <Box className={className}>
        <Box color="gray.600" fontSize="sm">
          Loading...
        </Box>
      </Box>
    )
  }

  if (!user && !showLoginButton) {
    return null
  }

  if (!user) {
    return (
      <Box className={className}>
        <styled.div
          color="#0E0E43"
          fontSize="sm"
          py="1.5"
          px="3"
          border="1px solid #0E0E43"
          borderRadius="md"
          bg="transparent"
          _hover={{ bg: '#0E0E43', color: 'white' }}
        >
          <Link to="/auth/login" style={{ textDecoration: 'none', color: 'inherit' }}>
            Admin Login
          </Link>
        </styled.div>
      </Box>
    )
  }

  return (
    <Flex className={className} align="center" gap="2">
      {showAvatar && <styled.img src={user.avatar_url} alt={user.login} w="6" h="6" borderRadius="full" />}
      <Flex direction="column" fontSize="xs">
        <Box fontWeight="bold" color="#0E0E43">
          Admin: {user.name || user.login}
        </Box>
        <Flex gap="2">
          <styled.div color="#0E0E43">
            <Link
              to="/admin"
              style={{
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Dashboard
            </Link>
          </styled.div>
          <styled.form method="post" action="/auth/logout" display="inline">
            <styled.button
              type="submit"
              bg="none"
              border="none"
              color="red.600"
              textDecoration="underline"
              cursor="pointer"
              fontSize="xs"
              p="0"
              _hover={{ color: 'red.700' }}
            >
              Logout
            </styled.button>
          </styled.form>
        </Flex>
      </Flex>
    </Flex>
  )
}
