import { data, Form, redirect, useLoaderData } from 'react-router'
import { z } from 'zod'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { Button } from '~/components/ui/styled/button'
import ConfluenceLogo from '~/images/svg/confluence-icon.svg?react'
import { getServices } from '~/remix-app-load-context'
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
        customfield_10136: z
            .object({
                value: z.string().nullable(),
            })
            .nullable(), //Time Bracket
    }),
})
export const jsonSchema = z.object({
    issues: z.array(z.object({ id: z.string() })),
    isLast: z.boolean(),
})

export const bulkIssuesSchema = z.object({
    issues: z.array(issueSchema),
})

/** Jira "Volunteer Team" label -> display name. */
const teamList: Record<string, string> = {
    'team-1': 'Team 1',
    'team-2': 'Team 2',
    'team-3': 'Team 3',
    'team-4': 'Team 4',
    'team-5': 'Team 5',
    'team-6': 'Team 6',
    'team-7': 'Team 7',
    'team-photographers': 'Photographers',
    'team-Sat-Bump-Out': 'Bump Out',
}

/** Jira "Location" label -> display name. */
const locationList: Record<string, string> = {
    'loc-black-swan-room': 'Black Swan Room',
    'loc-champions-terrace': 'Champions Terrace',
    'loc-cygnet-room': 'Cygnet Room',
    'loc-help-desk': 'Help Desk Level 3',
    'loc-L2-Lobby': 'Lobby Level 2',
    'loc-L3-lobby': 'Lobby Level 3',
    'loc-platinum-terrace': 'Platinum Terrace',
    'loc-premiership-terrace': 'Premiership Terrace',
    'loc-registration-area': 'Registration Area',
    'loc-river-view-room-1': 'River View Room 1',
    'loc-river-view-room-2': 'River View Room 2',
    'loc-river-view-room-3': 'River View Room 3',
    'loc-sports-lounge': 'Sports Lounge',
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

export async function loader({ params, context }: Route.LoaderArgs) {
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

    // auth needs to be set in JIRA_API_EMAIL JIRA_API_TOKEN env vars - pnpm jira:auth
    const services = getServices(context)
    const token = services.jiraAuth.authToken
    const email = services.jiraAuth.authEmail
    if (token === '' || email === '') {
        throw new Error('Error - Jira API credentials missing')
    }
    const authorization = `Basic ${btoa(`${email}:${token}`)}`

    // get ids of issues
    const fetchedIds = await fetch(
        `https://dddperth.atlassian.net/rest/api/3/search/jql?jql=project %3D VOL AND type %3D "Run Sheet Item" AND "Time Bracket[Dropdown]" %3D "Saturday Conference"${label && value ? jql : ''}&type=issue&product=jira&maxResults=150`,
        {
            method: 'GET',
            headers: {
                Authorization: authorization,
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
        "issueIdsOrKeys": [${issueIds.join(',')}],
        "properties": []
    }`
    // retrieve the issue details for all the ids in the issueIds list
    const fetchedIssues = await fetch('https://dddperth.atlassian.net/rest/api/3/issue/bulkfetch', {
        method: 'POST',
        headers: {
            Authorization: authorization,
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

    // Plain data, not JSX — the loader result is serialised to the client.
    const options = [
        ...Object.entries(teamList).map(([key, label]) => ({ value: `team.${key}`, label })),
        ...Object.entries(locationList).map(([key, label]) => ({ value: `location.${key}`, label })),
    ]
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
                                    {options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
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
                                                    ? issue.fields.customfield_10135
                                                          .map((location) => locationList[location] ?? location)
                                                          .join(', ')
                                                    : ''}
                                            </styled.td>
                                            <styled.td key="team" p="2" maxW="20">
                                                <Flex spaceX="1" overflowWrap="break-word" textWrap="wrap">
                                                    {issue.fields.customfield_10132
                                                        ? issue.fields.customfield_10132
                                                              .map((team) => teamList[team] ?? team)
                                                              .join(', ')
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
