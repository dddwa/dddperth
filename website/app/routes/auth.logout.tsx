import type { ActionFunctionArgs } from 'react-router'
import { logout } from '~/lib/auth.server'

export async function action({ request }: ActionFunctionArgs) {
  return await logout(request, '/')
}

export async function loader() {
  return { message: 'This route only accepts POST requests' }
}

export default function Logout() {
  return (
    <div>
      <p>Logging out...</p>
    </div>
  )
}