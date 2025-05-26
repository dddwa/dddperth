import type { LoaderFunctionArgs } from 'react-router'
import { authenticator, createUserSession, isAdmin } from '~/lib/auth.server'
import { redirect } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const user = await authenticator.authenticate('github', request)
    
    // Check if user is admin
    if (!isAdmin(user)) {
      throw redirect('/auth/login?error=access_denied')
    }
    
    // Create user session and redirect to admin
    return await createUserSession(request, user, '/admin')
  } catch (error) {
    // If authentication fails, redirect to login
    if (error instanceof Response) {
      throw error
    }
    return redirect('/auth/login?error=auth_failed')
  }
}