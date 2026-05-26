export interface AnnouncementEntity {
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

export interface AnnouncementsStore {
    getActive(year: string): Promise<AnnouncementData[]>
    getCurrent(year: string): Promise<AnnouncementEntity | null>
    upsert(year: string, message: string): Promise<void>
    clear(year: string): Promise<void>
}
