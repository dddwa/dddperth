import {
    addSlot as d1AddSlot,
    addTrack as d1AddTrack,
    assignTalkToSlot as d1AssignTalkToSlot,
    clearBoard as d1ClearBoard,
    getAgendaPlanningState,
    importAgendaPlanning,
    isAgendaPlanningEmpty,
    removeSlot as d1RemoveSlot,
    removeTrack as d1RemoveTrack,
    renameTrack as d1RenameTrack,
    saveTalkPlanningField as d1SaveTalkPlanningField,
    setCapacity as d1SetCapacity,
    updateSlotLabel as d1UpdateSlotLabel,
    updateSlotLength as d1UpdateSlotLength,
} from '../../agenda-planning.server'
import type { AgendaPlanningStore } from '../agenda-planning-store'

export function createD1AgendaPlanningStore(db: D1Database): AgendaPlanningStore {
    return {
        async getPlanningState(runId) {
            return getAgendaPlanningState(db, runId)
        },

        async isPlanningEmpty(runId) {
            return isAgendaPlanningEmpty(db, runId)
        },

        async saveTalkPlanningField(args) {
            await d1SaveTalkPlanningField(db, args)
        },

        async addTrack(args) {
            await d1AddTrack(db, args)
        },

        async renameTrack(args) {
            await d1RenameTrack(db, args)
        },

        async removeTrack(args) {
            await d1RemoveTrack(db, args)
        },

        async addSlot(args) {
            await d1AddSlot(db, args)
        },

        async updateSlotLength(args) {
            await d1UpdateSlotLength(db, args)
        },

        async updateSlotLabel(args) {
            await d1UpdateSlotLabel(db, args)
        },

        async removeSlot(args) {
            await d1RemoveSlot(db, args)
        },

        async assignTalkToSlot(args) {
            await d1AssignTalkToSlot(db, args)
        },

        async setCapacity(args) {
            await d1SetCapacity(db, args)
        },

        async clearBoard(runId) {
            await d1ClearBoard(db, runId)
        },

        async importPlanning(args) {
            return importAgendaPlanning(db, args)
        },
    }
}
