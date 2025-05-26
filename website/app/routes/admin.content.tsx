import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData, Link } from 'react-router'
import { requireAdmin, type User } from '~/lib/auth.server'
import { Box, Flex, Grid } from '~/styled-system/jsx'
import { styled } from '~/styled-system/jsx'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request)
  return { user }
}

export default function AdminContent() {
  const { user } = useLoaderData<{ user: User }>()

  return (
    <Box p="8">
      <Box
        maxW="1200px"
        mx="auto"
        bg="white"
        borderRadius="lg"
        boxShadow="lg"
        p="8"
      >
        <Box
          mb="8"
          borderBottom="1px solid"
          borderColor="gray.200"
          pb="4"
        >
          <styled.h1 m="0" mb="2" color="#0E0E43" fontSize="3xl" fontWeight="bold">
            Content Management
          </styled.h1>
          <styled.p m="0" color="gray.600" fontSize="lg">
            Manage blog posts, announcements, and website content
          </styled.p>
        </Box>

        <Grid columns={{ base: 1, md: 3 }} gap="8" mb="8">
          <Box
            bg="gray.50"
            p="6"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
              Blog Posts
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Create, edit, and manage blog posts for the website.
            </styled.p>
            <Flex gap="2">
              <styled.button
                bg="green.600"
                color="white"
                border="none"
                py="2"
                px="4"
                borderRadius="md"
                cursor="pointer"
                fontSize="sm"
                _hover={{ bg: "green.700" }}
              >
                New Post
              </styled.button>
              <styled.button
                bg="#0E0E43"
                color="white"
                border="none"
                py="2"
                px="4"
                borderRadius="md"
                cursor="pointer"
                fontSize="sm"
                _hover={{ bg: "#1a1a5e" }}
              >
                View All
              </styled.button>
            </Flex>
          </Box>

          <Box
            bg="gray.50"
            p="6"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
              Announcements
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Manage site-wide announcements and notices.
            </styled.p>
            <Flex gap="2">
              <styled.button
                bg="orange.600"
                color="white"
                border="none"
                py="2"
                px="4"
                borderRadius="md"
                cursor="pointer"
                fontSize="sm"
                _hover={{ bg: "orange.700" }}
              >
                New Announcement
              </styled.button>
              <styled.button
                bg="#0E0E43"
                color="white"
                border="none"
                py="2"
                px="4"
                borderRadius="md"
                cursor="pointer"
                fontSize="sm"
                _hover={{ bg: "#1a1a5e" }}
              >
                Manage
              </styled.button>
            </Flex>
          </Box>

          <Box
            bg="gray.50"
            p="6"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
              Static Pages
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Edit static pages like About, Contact, and Terms.
            </styled.p>
            <styled.button
              bg="blue.600"
              color="white"
              border="none"
              py="2"
              px="4"
              borderRadius="md"
              cursor="pointer"
              fontSize="sm"
              _hover={{ bg: "blue.700" }}
            >
              Edit Pages
            </styled.button>
          </Box>
        </Grid>

        <Box
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          p="6"
        >
          <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
            Recent Content Activity
          </styled.h3>
          <Flex direction="column" gap="4">
            <Box
              p="4"
              bg="white"
              borderRadius="md"
              border="1px solid"
              borderColor="gray.200"
            >
              <styled.h4 m="0" mb="2" fontSize="lg" fontWeight="medium">
                Blog Post: "Welcome to DDD 2024"
              </styled.h4>
              <Box m="0" color="gray.600" fontSize="sm">
                Published 2 days ago • Last edited by {user.login}
              </Box>
            </Box>
            <Box
              p="4"
              bg="white"
              borderRadius="md"
              border="1px solid"
              borderColor="gray.200"
            >
              <styled.h4 m="0" mb="2" fontSize="lg" fontWeight="medium">
                Announcement: "Early Bird Registration Open"
              </styled.h4>
              <Box m="0" color="gray.600" fontSize="sm">
                Published 5 days ago • Active
              </Box>
            </Box>
            <Box
              p="4"
              bg="white"
              borderRadius="md"
              border="1px solid"
              borderColor="gray.200"
            >
              <styled.h4 m="0" mb="2" fontSize="lg" fontWeight="medium">
                Page Update: "About Us"
              </styled.h4>
              <Box m="0" color="gray.600" fontSize="sm">
                Updated 1 week ago • Published
              </Box>
            </Box>
          </Flex>
        </Box>

        <Flex
          mt="8"
          justify="space-between"
          align="center"
        >
          <styled.div color="#0E0E43" fontSize="sm">
            <Link 
              to="/admin"
              style={{ 
                color: 'inherit',
                textDecoration: 'none'
              }}
            >
              ← Back to Dashboard
            </Link>
          </styled.div>
          <styled.button
            bg="green.700"
            color="white"
            border="none"
            py="2.5"
            px="5"
            borderRadius="md"
            cursor="pointer"
            fontSize="sm"
            _hover={{ bg: "green.800" }}
          >
            Export Content Report
          </styled.button>
        </Flex>
      </Box>
    </Box>
  )
}