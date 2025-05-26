import type { LoaderFunctionArgs } from 'react-router'
import { Form, useLoaderData } from 'react-router'
import { requireAdmin, type User } from '~/lib/auth.server'
import { Box, Flex, Grid } from '~/styled-system/jsx'
import { styled } from '~/styled-system/jsx'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request)
  return { user }
}

export default function AdminIndex() {
  const { user } = useLoaderData<{ user: User }>()

  return (
    <Box minH="100vh" bg="gray.50" p="8">
      <Box
        maxW="1200px"
        mx="auto"
        bg="white"
        borderRadius="lg"
        boxShadow="md"
        p="8"
      >
        <Flex
          justify="space-between"
          align="center"
          mb="8"
          borderBottom="1px solid"
          borderColor="gray.200"
          pb="4"
        >
          <Box>
            <styled.h1 m="0" mb="2" color="#0E0E43" fontSize="3xl" fontWeight="bold">
              Admin Dashboard
            </styled.h1>
            <styled.p m="0" color="gray.600" fontSize="lg">
              Welcome back, {user.name || user.login}!
            </styled.p>
          </Box>
          <Flex align="center" gap="4">
            <styled.img
              src={user.avatar_url}
              alt={user.login}
              w="10"
              h="10"
              borderRadius="full"
            />
            <Form method="post" action="/auth/logout">
              <styled.button
                type="submit"
                bg="red.600"
                color="white"
                border="none"
                py="2"
                px="4"
                borderRadius="md"
                cursor="pointer"
                fontSize="sm"
                _hover={{ bg: "red.700" }}
              >
                Logout
              </styled.button>
            </Form>
          </Flex>
        </Flex>

        <Grid
          gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
          gap="8"
          mb="8"
        >
          <Box
            bg="gray.50"
            p="6"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
              Content Management
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Manage website content, blog posts, and announcements.
            </styled.p>
            <styled.button
              bg="#0E0E43"
              color="white"
              border="none"
              py="2"
              px="4"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: "#1a1a5e" }}
            >
              Manage Content
            </styled.button>
          </Box>

          <Box
            bg="gray.50"
            p="6"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
              Event Management
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Manage speakers, sessions, and event configuration.
            </styled.p>
            <styled.button
              bg="#0E0E43"
              color="white"
              border="none"
              py="2"
              px="4"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: "#1a1a5e" }}
            >
              Manage Events
            </styled.button>
          </Box>

          <Box
            bg="gray.50"
            p="6"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
              User Management
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              View and manage user accounts and permissions.
            </styled.p>
            <styled.button
              bg="#0E0E43"
              color="white"
              border="none"
              py="2"
              px="4"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: "#1a1a5e" }}
            >
              Manage Users
            </styled.button>
          </Box>
        </Grid>

        <Box
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          p="6"
        >
          <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
            Quick Actions
          </styled.h3>
          <Flex gap="4" flexWrap="wrap">
            <styled.button
              bg="green.600"
              color="white"
              border="none"
              py="2.5"
              px="5"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: "green.700" }}
            >
              Create New Post
            </styled.button>
            <styled.button
              bg="blue.600"
              color="white"
              border="none"
              py="2.5"
              px="5"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: "blue.700" }}
            >
              Add Speaker
            </styled.button>
            <styled.button
              bg="purple.600"
              color="white"
              border="none"
              py="2.5"
              px="5"
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: "purple.700" }}
            >
              Schedule Session
            </styled.button>
          </Flex>
        </Box>

        <Box
          mt="8"
          p="4"
          bg="orange.50"
          border="1px solid"
          borderColor="orange.200"
          borderRadius="lg"
        >
          <styled.h4 m="0" mb="2" color="orange.800" fontWeight="semibold">
            Admin User Information
          </styled.h4>
          <Box m="0" color="orange.800" fontSize="sm">
            Logged in as: <styled.strong>{user.login}</styled.strong> ({user.email || 'No email'})
            <br />
            GitHub ID: {user.id}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}