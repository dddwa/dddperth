import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { Form } from 'react-router'
import { Button } from '~/components/ui/styled/button'
import { Flex, styled } from '~/styled-system/jsx'

/**
 * Admin-only button on the run sheets. Posts `intent=refresh` to the current
 * route, whose action invalidates the Jira cache for every run sheet view.
 * `filter` is echoed back so the redirect lands on the same filtered view.
 */
export function RunsheetRefreshForm({ refreshedAt, filter }: { refreshedAt: string | null; filter?: string }) {
    return (
        <Form method="post">
            <Flex alignItems="center" gap="2">
                {refreshedAt ? (
                    <styled.span fontSize="sm" color="admin.600">
                        Last refreshed {formatRefreshedAt(refreshedAt)}
                    </styled.span>
                ) : null}
                {filter !== undefined ? <input type="hidden" name="filter" value={filter} /> : null}
                <Button type="submit" name="intent" value="refresh">
                    Refresh from Jira
                </Button>
            </Flex>
        </Form>
    )
}

function formatRefreshedAt(iso: string): string {
    const dateTime = DateTime.fromISO(iso, { zone: conferenceManifest.public.timezone })
    return dateTime.isValid ? dateTime.toFormat('ccc h:mm a') : ''
}
