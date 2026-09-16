import { conferenceManifest } from '@conference/manifest'
import { describe, expect, it, vi } from 'vitest'
import type { JiraClient } from '../../sponsors/jira-client.server'
import type { AppConfig } from '../app-config'
import type { AssetStorage } from '../asset-storage'
import type { EmailService } from '../email-service'
import type { NotificationLog } from '../notification-log'
import type { SponsorsStore } from '../sponsors-store'
import { buildSponsorDetailsPayload, createJiraSponsorSyncService } from './jira-sponsor-sync.server'

const config = (jira: Partial<AppConfig['jira']> = {}): AppConfig => ({
    webUrl: 'https://example.test',
    sessionSecret: 'test',
    websiteAuthRequired: false,
    useSponsorFixtures: false,
    auth: { emailFrom: 'test@example.com' },
    sessionizeOverrides: {},
    speakerTicketClaimUrls: {},
    tito: {},
    jira: { writebackEnabled: false, stub: false, ...jira },
})

describe('buildSponsorDetailsPayload', () => {
    const fields = {
        website: 'website',
        quote: 'quote',
        socials: { linkedin: 'linkedin', twitter: 'twitter' },
    }

    it('clears removed optional social links in Jira', () => {
        expect(
            buildSponsorDetailsPayload(
                { blurb: 'Hello', websiteUrl: 'https://example.com', socials: { linkedin: 'https://in.test' } },
                fields,
            ),
        ).toMatchObject({
            website: 'https://example.com',
            linkedin: 'https://in.test',
            twitter: null,
        })
    })

    it('does not clear Jira prefill fields before the details form has been submitted', () => {
        expect(buildSponsorDetailsPayload({ socials: {} }, fields)).toEqual({})
    })
})

describe('getExhibitorLogistics', () => {
    it('fails closed when Jira is not configured', async () => {
        expect(conferenceManifest.sponsorPortal).toBeDefined()
        const service = createJiraSponsorSyncService({
            config: config(),
            sponsors: {} as SponsorsStore,
            assets: {} as AssetStorage,
            email: {} as EmailService,
            notifications: {} as NotificationLog,
        })

        await expect(service.getExhibitorLogistics()).rejects.toThrow('Jira client is not configured')
    })
})

describe('retryPendingStatusFlips', () => {
    it('writes details only on explicit saves, not status retries or logo uploads', async () => {
        const profile = {
            issueKey: 'SPN-1',
            blurb: 'About Acme',
            websiteUrl: 'https://acme.test',
            socials: {},
            logistics: { rafflePrize: 'Keyboard', socialQuote: 'Hello' },
            logisticsUpdatedAt: 123,
            logo: {
                r2Key: 'logo',
                filename: 'logo.svg',
                contentType: 'image/svg+xml',
                size: 100,
                uploadedAt: 1,
            },
        }
        const sponsor = {
            issueKey: 'SPN-1',
            year: '2026',
            companyName: 'Acme',
            tier: 'Digital',
            active: true,
            assetsTaskPending: false,
            contacts: [],
            profile,
        }
        const sponsors = {
            getPendingWritebacks: vi.fn(async () => []),
            listSponsors: vi.fn(async () => [sponsor]),
            getProfile: vi.fn(async () => profile),
            getSponsor: vi.fn(async () => sponsor),
        } as unknown as SponsorsStore
        const client: JiraClient = {
            searchSponsorIssues: vi.fn(async () => []),
            getStatusOptionId: vi.fn(async () => undefined),
            setStatusOptionId: vi.fn(async () => undefined),
            addLabel: vi.fn(async () => undefined),
            getExhibitorLogistics: vi.fn(async () => new Map()),
            pushLogistics: vi.fn(async () => undefined),
            addComment: vi.fn(async () => undefined),
            addAttachment: vi.fn(async () => undefined),
            updateIssueFields: vi.fn(async () => undefined),
            getSponsorDeliverables: vi.fn(async () => ({})),
        }
        const service = createJiraSponsorSyncService({
            config: config({ writebackEnabled: true }),
            sponsors,
            assets: {} as AssetStorage,
            email: {} as EmailService,
            notifications: {} as NotificationLog,
            jiraClient: client,
        })

        await service.retryPendingStatusFlips()

        expect(client.updateIssueFields).not.toHaveBeenCalled()
        expect(client.pushLogistics).not.toHaveBeenCalled()
        expect(client.setStatusOptionId).toHaveBeenCalledTimes(2)

        await service.attachUpdatedLogo('SPN-1')
        expect(client.updateIssueFields).not.toHaveBeenCalled()

        await service.pushSponsorDetails('SPN-1', profile)
        expect(client.updateIssueFields).toHaveBeenCalledTimes(1)

        vi.mocked(client.updateIssueFields).mockRejectedValueOnce(new Error('Jira unavailable'))
        await expect(service.pushSponsorDetails('SPN-1', profile)).rejects.toThrow('Jira unavailable')
    })
})
