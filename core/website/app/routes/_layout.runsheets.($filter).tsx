import type { ReactNode } from 'react'
import { data, Form, redirect, useLoaderData } from 'react-router'
import { z } from 'zod'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { Button } from '~/components/ui/styled/button'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.runsheets.($filter)'

export const issueSchema = z.object({
    id: z.string(),
    self: z.string(),
    key: z.string(),
    fields: z.object({
        summary: z.string(),
        issuetype: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
        }),
        labels: z.array(z.string()),
        status: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
        }),
        description: z.object().nullable(),
        customfield_10131: z.string().nullable(), // Role Instructions
        customfield_10132: z.array(z.string()).nullable(), // Volunteer Team
        customfield_10133: z.string().nullable(), // Item End Time
        customfield_10134: z.string().nullable(), // Item Start Time
        customfield_10135: z.array(z.string()), // Location
    }),
})
export const jsonSchema = z.object({
    issues: z.array(z.object({ id: z.string() })),
    isLast: z.boolean(),
})

export const bulkIssuesSchema = z.object({
    issues: z.array(issueSchema),
})

const teamList = ['team-1', 'team-2', 'team-3']
const locationList = [
    'loc-registration-area',
    'loc-river-room-1',
    'loc-river-room-2',
    'loc-river-room-3',
    'loc-sports-lounge',
    'loc-cygnet-room',
    'loc-champions-terrace',
    'loc-L2-lobby',
    'loc-black-swan-room',
]
export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData()
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const filter = formData.get('filter')?.toString()
    if (filter) {
        return redirect(`/runsheets/${filter}`)
    }
    return redirect(`/runsheets`)
}

export async function loader({ params }: Route.LoaderArgs) {
    const filter: string | undefined = params.filter
    // todo refactor when it's not 12am
    const split = filter ? filter.split('.') : null
    const label = split && (split[0] === 'team' || split[0] === 'location') ? split[0] : null
    let value: string | null = null
    let jql = ' AND '
    if (split && label && label === 'team' && teamList.includes(split[1])) {
        value = split[1]
        jql = jql + '"Volunteer Team[Labels]" %3D ' + value
    }
    if (split && label && label === 'location' && locationList.includes(split[1])) {
        value = split[1]
        jql = jql + '"Location[Labels]" %3D ' + value
    }

    // get ids of issues in team
    const fetchedIds = await fetch(
        `https://dddperth.atlassian.net/rest/api/3/search/jql?jql=project %3D VOL AND type %3D "Run Sheet Item"${label && value ? jql : ''}&type=issue&product=jira`,
        // 'https://dddperth.atlassian.net/rest/api/3/search/jql?jql=project %3D VOL AND type %3D "Run Sheet Item" AND "Volunteer Team[Labels]" %3D team-1&type=issue&product=jira',
        {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Buffer.from('email@email.com:api_key').toString('base64')}`,
                Accept: 'application/json',
            },
        },
    )
    if (!fetchedIds.ok) {
        throw new Error('Error fetching issue ids, responded with status: ' + fetchedIds.status)
    }
    const jsonIds = await fetchedIds.json()
    const idList = jsonSchema.parse(jsonIds).issues

    if (!idList) {
        throw new Error('Error parsing issue ids')
    }
    const issueIds = []
    for (const issue of idList) {
        issueIds.push(issue.id)
    }

    // get issue details
    if (issueIds.length <= 0) {
        throw new Error(`Error, no issues found${label && value ? ` with filter: ${value}` : ''}`)
    }
    const bodyData = `{
        "expand": [
        "names"
        ],
        "fields": [
        "issuetype",
        "labels",
        "status",
        "description",
        "customfield_10131",
        "customfield_10132",
        "customfield_10133",
        "customfield_10134",
        "customfield_10135",
        "summary"
        ],
        "fieldsByKeys": false,
        "issueIdsOrKeys": [${issueIds}],
        "properties": []
    }`
    const fetchedIssues = await fetch('https://dddperth.atlassian.net/rest/api/3/issue/bulkfetch', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from('email@email.com:api_key').toString('base64')}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: bodyData,
    })
    if (!fetchedIssues.ok) {
        throw new Error('Error fetching issues, responded with status: ' + fetchedIssues.status)
    }
    const issueJson = await fetchedIssues.json()
    const issues = bulkIssuesSchema.parse(issueJson).issues
    return data({ issues, filter })
}

export default function Index() {
    const { issues, filter } = useLoaderData<typeof loader>()

    return (
        <>
            <AdminLayout heading="Runsheets">
                <Form method="post">
                    <select name="filter" defaultValue={filter ? filter : ''}>
                        <option value="">Filter by Team or Location</option>
                        <option value="team.team-1">Team 1</option>
                        <option value="team.team-2">Team 2</option>
                        <option value="team.team-3">Team 3</option>
                        <option value="location.loc-black-swan-room">Black Swan Room</option>
                        <option value="location.loc-champions-terrace">Champions Terrace</option>
                        <option value="location.loc-cygnet-room">Cygnet Room</option>
                        <option value="location.loc-L2-lobby">Lobby Level 2</option>
                        <option value="location.loc-registration-area">Registration Area</option>
                        <option value="location.loc-river-room-1">River View Room 1</option>
                        <option value="location.loc-river-room-2">River View Room 2</option>
                        <option value="location.loc-river-room-3">River View Room 3</option>
                        <option value="location.loc-sports-lounge">Sports Lounge</option>
                    </select>
                    <Button type="submit">Apply Filter</Button>
                </Form>
                <Box maxW="4xl" mx="auto">
                    <AdminCard>
                        <styled.table width="full" fontSize="sm">
                            <thead>
                                <tr>
                                    <styled.th textAlign="left" p="2">
                                        Start Time
                                    </styled.th>
                                    <styled.th textAlign="left" p="2">
                                        End Time
                                    </styled.th>
                                    <styled.th textAlign="left" p="2">
                                        Summary
                                    </styled.th>
                                    <styled.th textAlign="left" p="2">
                                        Location
                                    </styled.th>
                                    <styled.th textAlign="left" p="2">
                                        Team
                                    </styled.th>
                                    <styled.th textAlign="left" p="2">
                                        Role Instructions
                                    </styled.th>
                                </tr>
                            </thead>
                            <tbody>
                                {issues?.map((issue) => {
                                    return (
                                        <tr
                                            key={issue.id}
                                            style={{
                                                backgroundColor: `${issue.fields.customfield_10132 && issue.fields.customfield_10132[0] === 'session' ? '#e9d5ff' : ''}`,
                                            }}
                                        >
                                            <styled.td p="2">
                                                {issue.fields.customfield_10134
                                                    ? formatTime(issue.fields.customfield_10134)
                                                    : '-'}
                                            </styled.td>
                                            <styled.td p="2">
                                                {formatTime(
                                                    issue.fields.customfield_10133
                                                        ? issue.fields.customfield_10133
                                                        : '-',
                                                )}
                                            </styled.td>
                                            <styled.td p="2">{issue.fields.summary}</styled.td>
                                            <styled.td p="2">
                                                {issue.fields.customfield_10135 ? (
                                                    issue.fields.customfield_10135.map((location) => {
                                                        return <>{location} </>
                                                    })
                                                ) : (
                                                    <></>
                                                )}
                                            </styled.td>
                                            <styled.td p="2" maxW="20">
                                                <Flex spaceX="1">
                                                    {issue.fields.customfield_10132 ? (
                                                        issue.fields.customfield_10132.map((team) => {
                                                            return <>{team} </>
                                                        })
                                                    ) : (
                                                        <></>
                                                    )}
                                                </Flex>
                                            </styled.td>
                                            <styled.td p="2">{issue.fields.customfield_10131}</styled.td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </styled.table>
                    </AdminCard>
                </Box>
            </AdminLayout>
        </>
    )
}

function formatTime(dateString: string) {
    const date: Date = new Date(dateString)
    const minutes = date.getMinutes()
    return `${date.getHours()}:${minutes < 10 ? 0 : ''}${minutes}`
}

function FilterButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
    return (
        <styled.button
            disabled={disabled}
            bg="admin.200"
            color="admin.800"
            border="admin-subtle"
            py="1.5"
            px="2.5"
            margin="1"
            borderRadius="md"
            fontSize="sm"
            fontWeight="semibold"
            cursor="pointer"
            transition="colors"
            _hover={{ bg: 'admin.800', color: 'admin.200' }}
            _disabled={{ bg: 'brand.primary', cursor: 'not-allowed', opacity: 0.8 }}
        >
            {children}
        </styled.button>
    )
}
