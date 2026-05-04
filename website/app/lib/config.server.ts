// Admin handles, should be lowercase
export const ADMIN_HANDLES = [
    'jakeginnivan',
    'vickiturns',
    'amykapernick',
    // Add more admin GitHub handles here
] as const

export type AdminHandle = (typeof ADMIN_HANDLES)[number]

export function isAdminHandle(handle: string): handle is AdminHandle {
    return ADMIN_HANDLES.includes(handle.toLowerCase() as AdminHandle)
}
