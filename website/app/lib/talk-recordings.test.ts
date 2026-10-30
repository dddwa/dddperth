import { conferenceManifest } from '@conference/manifest'
import { describe, expect, it } from 'vitest'

/**
 * `recordings` maps are hand-maintained config, and a bad entry fails quietly: the
 * talk page still renders, with a YouTube "video unavailable" box where the
 * recording should be. Sessionize years can't have their session ids checked here
 * without network access, but static session-data years can.
 */
describe('talk recordings config', () => {
    const years = Object.values(conferenceManifest.conferences.conferences).flatMap((conf) =>
        conf.kind === 'conference' && conf.recordings ? [conf] : [],
    )

    it.each(years.map((conf) => [conf.year, conf] as const))('%s uses YouTube video ids, not URLs', (_, conf) => {
        for (const videoId of Object.values(conf.recordings ?? {})) {
            expect(videoId).toMatch(/^[A-Za-z0-9_-]{11}$/)
        }
    })

    it('uses each video for one talk only', () => {
        const all = years.flatMap((conf) => Object.values(conf.recordings ?? {}))
        expect(all.filter((id, i) => all.indexOf(id) !== i)).toEqual([])
    })

    it.each(years.flatMap((conf) => (conf.sessions?.kind === 'session-data' ? [[conf.year, conf] as const] : [])))(
        '%s only has recordings for sessions in its agenda',
        (_, conf) => {
            const sessionIds = new Set(
                conf.sessions?.kind === 'session-data'
                    ? conf.sessions.sessions.flatMap((day) =>
                          day.rooms.flatMap((room) => room.sessions.map((s) => s.id)),
                      )
                    : [],
            )
            expect(Object.keys(conf.recordings ?? {}).filter((id) => !sessionIds.has(id))).toEqual([])
        },
    )
})
