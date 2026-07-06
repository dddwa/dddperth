import console from 'node:console'
import { data, useLoaderData } from 'react-router'
import { z } from 'zod'
import { AdminLayout } from '~/components/admin-layout'
import { Button } from '~/components/ui/button'
import { Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.runsheets._index'

export interface Issue {
    id: number
    // parent: Issue;
    // project: Project;
    key: string
    summary: string
    description: string
    issueType: IssueType
    status: IssueStatus
    labels: string[]

    // Custom fields - accessed via ID or key
    [customFieldId: string]: any
}
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
        customfield_10133: z.string(), // Item End Time
        customfield_10134: z.string(), // Item Start Time
        customfield_10135: z.array(z.string()), // Location
    }),
})

export interface IssueType {
    id: number
    name: string
    description: string
    // iconUrl: string;
    // hierarchyLevel: number;
    // properties: EntityProperties;
}

export interface IssueStatus {
    id: number
    name: string
    description: string
    category: IssueStatusCategory
}

export interface IssueStatusCategory {
    id: number
    key: string
    name: string
    colorName: string
}

export const jsonSchema = z.object({
    issues: z.array(z.object({ id: z.string() })),
    isLast: z.boolean(),
})

export const bulkIssuesSchema = z.object({
    issues: z.array(issueSchema),
})

export async function loader({ context }: Route.LoaderArgs) {
    // get ids of issues in team
    const fetchedIds = await fetch(
        'https://dddperth.atlassian.net/rest/api/3/search/jql?jql=project %3D VOL AND type %3D "Run Sheet Item" &type=issue&product=jira',
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
    console.log(jsonIds)
    const idList = jsonSchema.parse(jsonIds).issues

    if (!idList) {
        throw new Error('Error parsing issue ids')
    }
    const issueIds = []
    for (const issue in idList) {
        issueIds.push(`"${idList[issue].id}"`)
        console.log(issueIds)
    }

    // get issue details
    if (issueIds.length > 0) {
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
        console.log(issueJson)
        const issues = bulkIssuesSchema.parse(issueJson).issues

        return data(issues)
    }
}

export default function Index() {
    const issues = useLoaderData<typeof loader>()
    // if (issues) console.log(issues[0].fields)

    return (
        <>
            <AdminLayout heading="Runsheets">
                <Flex>
                    <Button
                        // type="submit"
                        // disabled={navigation.state === 'submitting'}
                        variant="solid"
                        size="sm"
                    >
                        Team 1
                    </Button>
                    <Button>Team 2</Button>
                </Flex>
                <styled.table width="full" fontSize="sm">
                    <thead>
                        <tr>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Summary
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Start Time
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                End Time
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Location
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Team
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Role Instructions
                            </styled.th>
                        </tr>
                    </thead>
                    <tbody>
                        {issues?.map((issue) => {
                            return (
                                <tr key={issue.id}>
                                    <styled.td p="2" border="admin-subtle">
                                        {issue.fields.summary}
                                    </styled.td>
                                    <styled.td p="2" border="admin-subtle">
                                        {issue.fields.customfield_10134}
                                    </styled.td>
                                    <styled.td p="2" border="admin-subtle">
                                        {issue.fields.customfield_10133}
                                    </styled.td>
                                    <styled.td p="2" border="admin-subtle">
                                        {issue.fields.customfield_10135}
                                    </styled.td>
                                    <styled.td p="2" border="admin-subtle">
                                        {issue.fields.customfield_10132}
                                    </styled.td>
                                    <styled.td p="2" border="admin-subtle">
                                        {issue.fields.customfield_10131}
                                    </styled.td>
                                </tr>
                            )
                        })}
                    </tbody>
                </styled.table>
            </AdminLayout>
        </>
    )
}
