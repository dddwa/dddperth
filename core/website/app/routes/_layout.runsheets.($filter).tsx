import { data, Form, redirect, useLoaderData } from 'react-router'
import { z } from 'zod'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { Button } from '~/components/ui/styled/button'
import ConfluenceLogo from '~/images/svg/confluence-icon.svg?react'
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
        customfield_10135: z.array(z.string()).nullable(), // Location
    }),
})
export const jsonSchema = z.object({
    issues: z.array(z.object({ id: z.string() })),
    isLast: z.boolean(),
})

export const bulkIssuesSchema = z.object({
    issues: z.array(issueSchema),
})

enum teamList {
    'team-1' = 'Team 1',
    'team-2' = 'Team 2',
    'team-3' = 'Team 3',
    'team-4' = 'Team 4',
    'team-5' = 'Team 5',
    'team-6' = 'Team 6',
    'team-7' = 'Team 7',
    'team-photographers' = 'Photographers',
    'team-Sat-Bump-Out' = 'Bump Out',
}
enum locationList {
    'loc-black-swan-room' = 'Black Swan Room',
    'loc-champions-terrace' = 'Champions Terrace',
    'loc-cygnet-room' = 'Cygnet Room',
    'loc-help-desk' = 'Help Desk Level 3',
    'loc-L2-Lobby' = 'Lobby Level 2',
    'loc-L3-lobby' = 'Lobby Level 3',
    'loc-platinum-terrace' = 'Platinum Terrace',
    'loc-premiership-terrace' = 'Premiership Terrace',
    'loc-registration-area' = 'Registration Area',
    'loc-river-view-room-1' = 'River View Room 1',
    'loc-river-view-room-2' = 'River View Room 2',
    'loc-river-view-room-3' = 'River View Room 3',
    'loc-sports-lounge' = 'Sports Lounge',
}

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

    // filter using JQL based on the param passed from the select
    let value: string | null = null
    let label: string | null = null
    let jql = ' AND '
    if (filter) {
        const splitFilter = filter.split('.')
        switch (splitFilter[0]) {
            case 'team': {
                label = 'team'
                if (Object.keys(teamList).includes(splitFilter[1])) {
                    value = splitFilter[1]
                }
                jql = jql + '"Volunteer Team[Labels]" %3D ' + value
                break
            }
            case 'location': {
                label = 'team'
                if (Object.keys(locationList).includes(splitFilter[1])) {
                    value = splitFilter[1]
                }
                jql = jql + '"Location[Labels]" %3D ' + value
            }
        }
    }

    // get ids of issues
    const fetchedIds = await fetch(
        `https://dddperth.atlassian.net/rest/api/3/search/jql?jql=project %3D VOL AND type %3D "Run Sheet Item" AND "Time Bracket[Dropdown]" %3D "Saturday Conference"${label && value ? jql : ''}&type=issue&product=jira&maxResults=150`,
        {
            method: 'GET',
            headers: {
                // Auth WIP - currently using my email and api locally
                Authorization: `Basic ${Buffer.from('email@email.com:api_key').toString('base64')}`,
                Accept: 'application/json',
            },
        },
    )
    if (!fetchedIds.ok) {
        throw new Error('Error fetching issue ids, responded with status: ' + fetchedIds.status)
    }

    // parse returned json to get the list of IDs that match the filters
    const jsonIds = await fetchedIds.json()
    const idList = jsonSchema.parse(jsonIds).issues
    if (!idList) {
        throw new Error('Error parsing issue ids')
    }
    const issueIds = []
    for (const issue of idList) {
        issueIds.push(issue.id)
    }
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
        "customfield_10136",
        "summary"
        ],
        "fieldsByKeys": false,
        "issueIdsOrKeys": [${issueIds}],
        "properties": []
    }`
    // retrieve the issue details for all the ids in the issueIds list
    const fetchedIssues = await fetch('https://dddperth.atlassian.net/rest/api/3/issue/bulkfetch', {
        method: 'POST',
        headers: {
            // Auth WIP - currently using my email and api locally
            Authorization: `Basic ${Buffer.from('email@email.com:api_key').toString('base64')}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: bodyData,
    })
    if (!fetchedIssues.ok) {
        throw new Error('Error fetching issues, responded with status: ' + fetchedIssues.status)
    }

    // parse and sort issues
    const issueJson = await fetchedIssues.json()
    const issues = bulkIssuesSchema.parse(issueJson).issues
    issues.sort((a, b) => {
        const timeA = a.fields.customfield_10134
        const timeB = b.fields.customfield_10134

        if (timeA === null && timeB === null) return 0
        if (timeA === null) return 1
        if (timeB === null) return -1

        return timeA.localeCompare(timeB)
    })

    // todo - fix the type errors
    // create options list for the select using the nice names for the teams and locations in the enums
    const options: JSX.Element[] = []
    Object.keys(teamList).forEach((team) => {
        options.push(
            <option key={team} value={`team.${team}`}>
                {teamList[team]}
            </option>,
        )
    })
    Object.keys(locationList).forEach((location) => {
        options.push(
            <option key={location} value={`location.${location}`}>
                {locationList[location]}
            </option>,
        )
    })
    return data({ issues, filter, options })
}

export default function Index() {
    const { issues, filter, options } = useLoaderData<typeof loader>()

    return (
        <>
            <AdminLayout heading="Runsheets">
                <Box maxW="4xl" mx="auto">
                    <AdminCard overflow="scroll">
                        <Form method="post">
                            <Flex alignContent={'center'} marginBottom={'2'} maxWidth={'fit'} gap={'1'}>
                                <select
                                    name="filter"
                                    defaultValue={filter ? filter : ''}
                                    style={{
                                        borderWidth: '1px',
                                        borderColor: 'gray',
                                        padding: '8px',
                                        borderRadius: '5px',
                                    }}
                                >
                                    <option value="">Filter by Team or Location</option>
                                    {options}
                                </select>
                                <Button type="submit">Apply Filter</Button>
                            </Flex>
                        </Form>
                        <styled.table width="full" fontSize="sm" overflow="scroll">
                            <thead>
                                <tr>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Start Time
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        End Time
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Summary
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Location
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" textWrap="wrap">
                                        Team
                                    </styled.th>
                                    <styled.th
                                        textAlign="left"
                                        p="2"
                                        maxW="40"
                                        overflowWrap="break-word"
                                        textWrap="wrap"
                                    >
                                        Role Details
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
                                                borderWidth: '1px',
                                                borderColor: 'gray',
                                            }}
                                        >
                                            <styled.td key="start-time" p="2">
                                                {issue.fields.customfield_10134
                                                    ? formatTime(issue.fields.customfield_10134)
                                                    : '-'}
                                            </styled.td>
                                            <styled.td key="end-time" p="2">
                                                {issue.fields.customfield_10133
                                                    ? formatTime(issue.fields.customfield_10133)
                                                    : '-'}
                                            </styled.td>
                                            <styled.td key="summary" p="2">
                                                {issue.fields.summary}
                                            </styled.td>
                                            <styled.td key="location" p="2">
                                                {issue.fields.customfield_10135
                                                    ? issue.fields.customfield_10135.map((location) => {
                                                          return `${
                                                              locationList[location] === undefined
                                                                  ? location
                                                                  : locationList[location]
                                                          }${issue.fields.customfield_10135?.length > 1 ? ', ' : ''}`
                                                      })
                                                    : ''}
                                            </styled.td>
                                            <styled.td key="team" p="2" maxW="20">
                                                <Flex spaceX="1" overflowWrap="break-word" textWrap="wrap">
                                                    {issue.fields.customfield_10132
                                                        ? issue.fields.customfield_10132.map((team) => {
                                                              return `${
                                                                  teamList[team] === undefined ? team : teamList[team]
                                                              }${issue.fields.customfield_10132?.length > 1 ? ', ' : ''}`
                                                          })
                                                        : ''}
                                                </Flex>
                                            </styled.td>
                                            <styled.td key="role-instructions" p="2" maxW="20" alignContent={'center'}>
                                                {issue.fields.customfield_10131 ? (
                                                    <a href={issue.fields.customfield_10131}>
                                                        <ConfluenceLogo height="2rem" />
                                                    </a>
                                                ) : (
                                                    <></>
                                                )}
                                            </styled.td>
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
