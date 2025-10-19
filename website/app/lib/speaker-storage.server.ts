import type { TableClient, TableServiceClient } from '@azure/data-tables'

// Table names
const SPEAKER_PROFILES_TABLE = 'SpeakerProfiles'
const SPEAKER_YEARS_TABLE = 'SpeakerYears'
const SPEAKER_ONBOARDING_TABLE = 'SpeakerOnboarding'

// Ensure tables exist
export async function initializeSpeakerTables(tableServiceClient: TableServiceClient): Promise<void> {
    const tables = [SPEAKER_PROFILES_TABLE, SPEAKER_YEARS_TABLE, SPEAKER_ONBOARDING_TABLE]

    for (const tableName of tables) {
        try {
            await tableServiceClient.createTable(tableName)
            console.log(`Table ${tableName} created or already exists`)
        } catch (error) {
            if (error instanceof Error && error.message.includes('TableAlreadyExists')) {
                console.log(`Table ${tableName} already exists`)
            } else {
                console.error(`Error creating table ${tableName}:`, error)
                throw error
            }
        }
    }
}

// Speaker Profile operations
export interface SpeakerProfile {
    partitionKey: `speaker_${string}` // speaker_{email}
    rowKey: 'profile'
    email: string
    githubId?: string
    name: string
    bio?: string
    profilePicture?: string
    createdAt: string
    lastUpdatedAt: string
}

export async function getSpeakerProfile(tableClient: TableClient, email: string): Promise<SpeakerProfile | null> {
    try {
        const partitionKey: SpeakerProfile['partitionKey'] = `speaker_${email.toLowerCase()}`
        const rowKey: SpeakerProfile['rowKey'] = 'profile'
        const entity: SpeakerProfile = await tableClient.getEntity(partitionKey, rowKey)
        return entity
    } catch (error) {
        if (error instanceof Error && error.message.includes('ResourceNotFound')) {
            return null
        }
        throw error
    }
}

export async function upsertSpeakerProfile(tableClient: TableClient, email: string, data: Omit<SpeakerProfile, 'partitionKey' | 'rowKey' | 'email' | 'lastUpdatedAt'>): Promise<void> {
    const entity: SpeakerProfile = {
        partitionKey: `speaker_${email.toLowerCase()}`,
        rowKey: 'profile',
        email: email.toLowerCase(),
        ...data,
        lastUpdatedAt: new Date().toISOString(),
    }

    await tableClient.upsertEntity(entity)
}

// Speaker Years operations - tracks speaker participation per year
export interface SpeakerYear {
    partitionKey: `speaker_${string}` // speaker_{email}
    rowKey: string // year (e.g., '2025')
    email: string
    year: string
    sessionizeId?: string
    sessionsJson?: string // JSON string of session data
    onboardingComplete: boolean
    createdAt: string
    lastUpdatedAt: string
}

export async function getSpeakerYear(tableClient: TableClient, email: string, year: string): Promise<SpeakerYear | null> {
    try {
        const partitionKey: SpeakerYear['partitionKey'] = `speaker_${email.toLowerCase()}`
        const rowKey: SpeakerYear['rowKey'] = year
        const entity: SpeakerYear = await tableClient.getEntity(partitionKey, rowKey)
        return entity
    } catch (error) {
        if (error instanceof Error && error.message.includes('ResourceNotFound')) {
            return null
        }
        throw error
    }
}

export async function getSpeakerYears(tableClient: TableClient, email: string): Promise<SpeakerYear[]> {
    const results: SpeakerYear[] = []
    const partitionKey: SpeakerYear['partitionKey'] = `speaker_${email.toLowerCase()}`
    const iterator = tableClient.listEntities<SpeakerYear>({
        queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    })

    for await (const entity of iterator) {
        results.push(entity)
    }

    return results
}

export async function upsertSpeakerYear(tableClient: TableClient, email: string, year: string, data: Partial<Omit<SpeakerYear, 'partitionKey' | 'rowKey' | 'email' | 'year' | 'lastUpdatedAt'>>): Promise<void> {
    const existing = await getSpeakerYear(tableClient, email, year)
    
    const entity: SpeakerYear = {
        partitionKey: `speaker_${email.toLowerCase()}`,
        rowKey: year,
        email: email.toLowerCase(),
        year,
        sessionizeId: existing?.sessionizeId,
        sessionsJson: existing?.sessionsJson,
        onboardingComplete: existing?.onboardingComplete ?? false,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        ...data,
        lastUpdatedAt: new Date().toISOString(),
    }

    await tableClient.upsertEntity(entity)
}

// Speaker Onboarding operations
export interface SpeakerOnboarding {
    partitionKey: `onboarding_${string}` // onboarding_{year}
    rowKey: `${string}_${string}` // {email}_{timestamp}
    email: string
    year: string
    
    // Form fields
    name: string
    namePhoneticSpelling: string
    qaHandling: string
    presentationElementsJson: string // JSON array of checkboxes
    recordingOptOut: boolean
    introductionText: string
    presentationNotes?: string
    dietaryRequirements?: string
    speakerDinnerRsvp: string
    trainingSessionSelectionsJson: string // JSON array of checkboxes
    meetExpertsOptIn: boolean
    
    submittedAt: string
}

export async function saveOnboardingData(
    tableClient: TableClient,
    data: Omit<SpeakerOnboarding, 'partitionKey' | 'rowKey' | 'submittedAt'>,
): Promise<void> {
    const timestamp = new Date().toISOString()
    const entity: SpeakerOnboarding = {
        partitionKey: `onboarding_${data.year}`,
        rowKey: `${data.email.toLowerCase()}_${timestamp.replace(/[:.]/g, '-')}`, // Make timestamp Azure Table safe
        ...data,
        email: data.email.toLowerCase(),
        submittedAt: timestamp,
    }

    await tableClient.createEntity(entity)
    
    // Update the speaker year to mark onboarding as complete
    await upsertSpeakerYear(tableClient, data.email, data.year, { onboardingComplete: true })
}

export async function getLatestOnboardingData(
    tableClient: TableClient,
    email: string,
    year: string,
): Promise<SpeakerOnboarding | null> {
    try {
        const partitionKey: SpeakerOnboarding['partitionKey'] = `onboarding_${year}`
        const emailPrefix = email.toLowerCase()
        
        const iterator = tableClient.listEntities<SpeakerOnboarding>({
            queryOptions: { 
                filter: `PartitionKey eq '${partitionKey}' and RowKey ge '${emailPrefix}_' and RowKey lt '${emailPrefix}~'`,
            },
        })

        let latestData: SpeakerOnboarding | null = null
        for await (const entity of iterator) {
            if (!latestData || entity.submittedAt > latestData.submittedAt) {
                latestData = entity
            }
        }

        return latestData
    } catch (error) {
        console.error('Error fetching latest onboarding data:', error)
        return null
    }
}

export async function getOnboardingStatus(
    tableClient: TableClient,
    email: string,
    year: string,
): Promise<{ complete: boolean; data?: SpeakerOnboarding }> {
    const speakerYear = await getSpeakerYear(tableClient, email, year)
    
    if (!speakerYear?.onboardingComplete) {
        return { complete: false }
    }

    const data = await getLatestOnboardingData(tableClient, email, year)
    
    return { 
        complete: true, 
        data: data ?? undefined
    }
}

// Helper function to get onboarding data for all speakers in a year (admin view)
export async function getAllOnboardingForYear(
    tableClient: TableClient,
    year: string,
): Promise<SpeakerOnboarding[]> {
    const results: SpeakerOnboarding[] = []
    const partitionKey: SpeakerOnboarding['partitionKey'] = `onboarding_${year}`
    
    const iterator = tableClient.listEntities<SpeakerOnboarding>({
        queryOptions: { filter: `PartitionKey eq '${partitionKey}'` },
    })

    for await (const entity of iterator) {
        results.push(entity)
    }

    return results
}

// Export table names for use with getTableClient
export const SPEAKER_TABLE_NAMES = {
    PROFILES: SPEAKER_PROFILES_TABLE,
    YEARS: SPEAKER_YEARS_TABLE,
    ONBOARDING: SPEAKER_ONBOARDING_TABLE,
} as const