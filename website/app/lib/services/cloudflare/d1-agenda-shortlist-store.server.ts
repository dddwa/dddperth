import {
    addShortlistPick,
    getShortlistCountsForYear,
    getShortlistPicksForBrowser,
    removeShortlistPick,
} from '../../agenda-shortlist.server'
import type { AgendaShortlistStore } from '../agenda-shortlist-store'

export function createD1AgendaShortlistStore(db: D1Database): AgendaShortlistStore {
    return {
        async addPick(args) {
            await addShortlistPick(db, args)
        },

        async removePick(args) {
            await removeShortlistPick(db, args)
        },

        async getCountsForYear(year) {
            return getShortlistCountsForYear(db, year)
        },

        async getPicksForBrowser(args) {
            return getShortlistPicksForBrowser(db, args)
        },
    }
}
