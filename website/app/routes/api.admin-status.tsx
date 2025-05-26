import type { LoaderFunctionArgs } from 'react-router'
import { getOptionalAdminUser } from '~/lib/admin.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalAdminUser(request)
  return Response.json({ user })
}
