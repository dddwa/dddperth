import type { LoaderFunctionArgs } from 'react-router'
import { Outlet, useLoaderData, NavLink, Form } from 'react-router'
import { requireAdmin, type User } from '~/lib/auth.server'
import { Box, Flex } from '~/styled-system/jsx'
import { styled } from '~/styled-system/jsx'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request)
  return { user }
}

export default function AdminLayout() {
  const { user } = useLoaderData<{ user: User }>()

  return (
    <Box minH="100vh" bg="gray.50">
      <styled.nav
        bg="#0E0E43"
        color="white"
        py="4"
        px="8"
      >
        <Flex justify="space-between" align="center">
          <Flex align="center" gap="8">
            <styled.h1 m="0" fontSize="xl" fontWeight="bold">DDD Admin</styled.h1>
            <Flex gap="4">
              <styled.div>
                <NavLink
                  to="/admin"
                  style={({ isActive }) => ({
                    color: isActive ? '#fbbf24' : 'white',
                    textDecoration: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: isActive ? 'rgba(251, 191, 36, 0.1)' : 'transparent'
                  })}
                >
                  Dashboard
                </NavLink>
              </styled.div>
              <styled.div>
                <NavLink
                  to="/admin/content"
                  style={({ isActive }) => ({
                    color: isActive ? '#fbbf24' : 'white',
                    textDecoration: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: isActive ? 'rgba(251, 191, 36, 0.1)' : 'transparent'
                  })}
                >
                  Content
                </NavLink>
              </styled.div>
              <styled.div>
                <NavLink
                  to="/admin/events"
                  style={({ isActive }) => ({
                    color: isActive ? '#fbbf24' : 'white',
                    textDecoration: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: isActive ? 'rgba(251, 191, 36, 0.1)' : 'transparent'
                  })}
                >
                  Events
                </NavLink>
              </styled.div>
            </Flex>
          </Flex>
          <Flex align="center" gap="4">
            <styled.img
              src={user.avatar_url}
              alt={user.login}
              w="8"
              h="8"
              borderRadius="full"
            />
            <Box fontSize="sm">{user.name || user.login}</Box>
            <Form method="post" action="/auth/logout">
              <styled.button
                type="submit"
                bg="transparent"
                color="white"
                border="1px solid rgba(255, 255, 255, 0.3)"
                py="1.5"
                px="3"
                borderRadius="md"
                cursor="pointer"
                fontSize="sm"
                _hover={{ bg: "white/10" }}
              >
                Logout
              </styled.button>
            </Form>
          </Flex>
        </Flex>
      </styled.nav>
      <styled.main>
        <Outlet />
      </styled.main>
    </Box>
  )
}