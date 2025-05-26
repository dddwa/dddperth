import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData, Link } from 'react-router'
import { requireAdmin, type User } from '~/lib/auth.server'
import { Box, Flex, Grid } from '~/styled-system/jsx'
import { styled } from '~/styled-system/jsx'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request)
  return { user }
}

export default function AdminEvents() {
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
            Event Management
          </styled.h1>
          <styled.p m="0" color="gray.600" fontSize="lg">
            Manage speakers, sessions, and event configuration
          </styled.p>
        </Box>

        <Grid columns={{ base: 1, md: 2, lg: 4 }} gap="8" mb="8">
          <Box
            bg="gray.50"
            p="6"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
              Speakers
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Add, edit, and manage event speakers and their profiles.
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
                Add Speaker
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
                Manage All
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
              Sessions & Talks
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Schedule and manage conference sessions and presentations.
            </styled.p>
            <Flex gap="2">
              <styled.button
                bg="purple.600"
                color="white"
                border="none"
                py="2"
                px="4"
                borderRadius="md"
                cursor="pointer"
                fontSize="sm"
                _hover={{ bg: "purple.700" }}
              >
                Add Session
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
                View Schedule
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
              Event Configuration
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              Configure event settings, dates, and venues.
            </styled.p>
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
              Edit Config
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
              Registrations
            </styled.h3>
            <styled.p m="0" mb="4" color="gray.600">
              View and manage event registrations and attendees.
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
              View Registrations
            </styled.button>
          </Box>
        </Grid>

        <Box
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          p="6"
          mb="8"
        >
          <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
            Event Statistics
          </styled.h3>
          <Grid columns={{ base: 2, md: 4 }} gap="4">
            <Box
              bg="blue.50"
              p="4"
              borderRadius="md"
              textAlign="center"
            >
              <styled.h4 m="0" mb="2" color="blue.700" fontSize="3xl" fontWeight="bold">
                12
              </styled.h4>
              <Box m="0" color="blue.700" fontSize="sm">
                Confirmed Speakers
              </Box>
            </Box>
            <Box
              bg="green.50"
              p="4"
              borderRadius="md"
              textAlign="center"
            >
              <styled.h4 m="0" mb="2" color="green.700" fontSize="3xl" fontWeight="bold">
                24
              </styled.h4>
              <Box m="0" color="green.700" fontSize="sm">
                Scheduled Sessions
              </Box>
            </Box>
            <Box
              bg="yellow.50"
              p="4"
              borderRadius="md"
              textAlign="center"
            >
              <styled.h4 m="0" mb="2" color="yellow.700" fontSize="3xl" fontWeight="bold">
                324
              </styled.h4>
              <Box m="0" color="yellow.700" fontSize="sm">
                Total Registrations
              </Box>
            </Box>
            <Box
              bg="purple.50"
              p="4"
              borderRadius="md"
              textAlign="center"
            >
              <styled.h4 m="0" mb="2" color="purple.700" fontSize="3xl" fontWeight="bold">
                5
              </styled.h4>
              <Box m="0" color="purple.700" fontSize="sm">
                Days Remaining
              </Box>
            </Box>
          </Grid>
        </Box>

        <Box
          bg="gray.50"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          p="6"
        >
          <styled.h3 m="0" mb="4" color="#0E0E43" fontSize="xl" fontWeight="semibold">
            Recent Activity
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
                Speaker Added: John Doe
              </styled.h4>
              <Box m="0" color="gray.600" fontSize="sm">
                Added 1 hour ago • Talk: "Advanced Domain Modeling"
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
                Session Scheduled: Workshop Track
              </styled.h4>
              <Box m="0" color="gray.600" fontSize="sm">
                Scheduled 3 hours ago • 2:00 PM - 4:00 PM
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
                Registration Milestone: 300+ Attendees
              </styled.h4>
              <Box m="0" color="gray.600" fontSize="sm">
                Reached yesterday • 75% capacity
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
          <Flex gap="4">
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
              Export Attendee List
            </styled.button>
            <styled.button
              bg="purple.700"
              color="white"
              border="none"
              py="2.5"
              px="5"
              borderRadius="md"
              cursor="pointer"
              fontSize="sm"
              _hover={{ bg: "purple.800" }}
            >
              Generate Schedule
            </styled.button>
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}