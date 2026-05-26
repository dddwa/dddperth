import { z } from 'zod'

export const sessionSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.nullable(z.string()),
    startsAt: z.nullable(z.string()),
    endsAt: z.nullable(z.string()),
    isServiceSession: z.boolean(),
    isPlenumSession: z.boolean(),
    speakers: z.array(z.object({ id: z.string(), name: z.string() })),
    categories: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            categoryItems: z.array(
                z.object({
                    id: z.number(),
                    name: z.string(),
                }),
            ),
            sort: z.nullable(z.number()),
        }),
    ),
    roomId: z.nullable(z.number()),
    room: z.nullable(z.string()),
    liveUrl: z.nullable(z.string()),
    recordingUrl: z.nullable(z.string()),
    status: z.nullable(z.string()),
    isInformed: z.boolean(),
    isConfirmed: z.boolean(),
    questionAnswers: z.array(z.any()).optional(),
})

export const roomSchema = z.object({
    id: z.number(),
    name: z.string(),
    session: sessionSchema,
    index: z.number(),
})

export const timeSlotSchema = z.object({
    slotStart: z.string(),
    rooms: z.array(roomSchema),
})

export const gridRoomSchema = z.object({
    id: z.number(),
    name: z.string(),
    sessions: z.array(sessionSchema),
    hasOnlyPlenumSessions: z.boolean(),
})

export const gridSmartSchema = z.array(
    z.object({
        date: z.string(),
        isDefault: z.boolean(),
        rooms: z.array(gridRoomSchema),
        timeSlots: z.array(timeSlotSchema),
    }),
)
