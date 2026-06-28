import { data, useLoaderData } from 'react-router'
import { AdminLayout } from '~/components/admin-layout'
import { styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.runsheets._index'

export async function loader({ context }: Route.LoaderArgs) {
    return data({ test: 'Meow' })
}

export default function Index() {
    const { test } = useLoaderData<typeof loader>()

    return (
        <>
            <AdminLayout heading="Runsheets">
                <p>Hi </p>
                <styled.table width="full" fontSize="sm">
                    <thead>
                        <tr>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Start Time
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                End Time
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Summary
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Location
                            </styled.th>
                            <styled.th textAlign="left" p="2" border="admin-subtle">
                                Role Instructions
                            </styled.th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr key={0}>
                            <styled.td p="2" border="admin-subtle">
                                06:30
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                17:00
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                3
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                4
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                5
                            </styled.td>
                        </tr>
                        <tr key={1}>
                            <styled.td p="2" border="admin-subtle">
                                08:30
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                17:00
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                8
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                9
                            </styled.td>
                            <styled.td p="2" border="admin-subtle">
                                10
                            </styled.td>
                        </tr>
                    </tbody>
                </styled.table>
            </AdminLayout>
        </>
    )
}
