import { redirect } from 'react-router'
import { isAdmin, getUser, type User } from './auth.server'

export async function requireAdminUser(request: Request): Promise<User> {
  const user = await getUser(request)
  
  if (!user) {
    throw redirect('/auth/login')
  }
  
  if (!isAdmin(user)) {
    throw new Response('Access denied. Admin privileges required.', { 
      status: 403,
      statusText: 'Forbidden'
    })
  }
  
  return user
}

export async function getOptionalAdminUser(request: Request): Promise<User | null> {
  const user = await getUser(request)
  return user && isAdmin(user) ? user : null
}

export function createAdminLoader<T = {}>(
  loader?: (args: { request: Request; user: User } & T) => Promise<any>
) {
  return async (args: any) => {
    const user = await requireAdminUser(args.request)
    
    if (loader) {
      return loader({ ...args, user })
    }
    
    return { user }
  }
}

export function createAdminAction<T = {}>(
  action: (args: { request: Request; user: User } & T) => Promise<any>
) {
  return async (args: any) => {
    const user = await requireAdminUser(args.request)
    return action({ ...args, user })
  }
}