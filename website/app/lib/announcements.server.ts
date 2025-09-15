import type { TableClient } from '@azure/data-tables'
import type { AppLoadContext } from 'react-router'

export interface AnnouncementEntity {
    partitionKey: 'announcement'
    rowKey: string
    message: string
    createdTime: string
    updatedTime?: string
    isActive: boolean
}

export interface AnnouncementData {
    createdTime: string
    update: string
}

export function getAnnouncementsTableName(year: string): string {
    return `Announcements${year}`
}

export async function getActiveAnnouncements(context: AppLoadContext, year: string): Promise<AnnouncementData[]> {
    try {
        const tableName = getAnnouncementsTableName(year)
        const tableClient = context.getTableClient(tableName)

        const entities = tableClient.listEntities<AnnouncementEntity>({
            queryOptions: {
                filter: `PartitionKey eq 'announcement' and isActive eq true`,
            },
        })

        const announcements: AnnouncementData[] = []
        for await (const entity of entities) {
            announcements.push({
                createdTime: entity.createdTime,
                update: entity.message,
            })
        }
        return announcements.sort((a, b) => {
            return new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
        })
    } catch (error) {
        console.error('Error fetching announcements:', error)
        return []
    }
}

export async function createOrUpdateAnnouncement(
    context: AppLoadContext,
    year: string,
    message: string,
): Promise<void> {
    const tableName = getAnnouncementsTableName(year)
    const tableClient = context.getTableClient(tableName)

    await ensureTableExists(tableClient)

    const now = new Date().toISOString()
    const entity: AnnouncementEntity = {
        partitionKey: 'announcement',
        rowKey: 'current',
        message,
        createdTime: now,
        updatedTime: now,
        isActive: true,
    }

    await tableClient.upsertEntity(entity, 'Replace')
}

export async function clearAnnouncement(context: AppLoadContext, year: string): Promise<void> {
    const tableName = getAnnouncementsTableName(year)
    const tableClient = context.getTableClient(tableName)

    await ensureTableExists(tableClient)

    const entity: AnnouncementEntity = {
        partitionKey: 'announcement',
        rowKey: 'current',
        message: '',
        createdTime: new Date().toISOString(),
        updatedTime: new Date().toISOString(),
        isActive: false,
    }

    await tableClient.upsertEntity(entity, 'Replace')
}

export async function getCurrentAnnouncement(
    context: AppLoadContext,
    year: string,
): Promise<AnnouncementEntity | null> {
    try {
        const tableName = getAnnouncementsTableName(year)
        const tableClient = context.getTableClient(tableName)

        const entity = await tableClient.getEntity<AnnouncementEntity>('announcement', 'current')
        return entity
    } catch (error) {
        return null
    }
}

async function ensureTableExists(tableClient: TableClient): Promise<void> {
    try {
        await tableClient.createTable()
    } catch (error: any) {
        if (error.statusCode !== 409) {
            throw error
        }
    }
}
