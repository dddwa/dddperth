# Admin Area Setup Guide

This guide will help you set up and configure the admin area for the DDD website.

## Prerequisites

- GitHub OAuth App configured
- Environment variables properly set
- Node.js and pnpm installed
- Panda CSS configured (already included in the project)

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: `DDD Admin`
   - Homepage URL: Your website URL (e.g., `https://dddperth.com/`)
   - Authorization callback URL: `https://dddperth.com/auth/github/callback`
4. Click "Register application"
5. Copy the Client ID and Client Secret

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# GitHub OAuth for admin authentication
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

Make sure your `WEB_URL` and `SESSION_SECRET` are also properly configured:

```bash
WEB_URL=https://your-domain.com
SESSION_SECRET=your_secure_session_secret_here
```

## Admin User Configuration

Admin users are configured in `website/app/lib/config.server.ts`. Edit the `ADMIN_HANDLES` array to include GitHub usernames:

```typescript
export const ADMIN_HANDLES = [
    'admin1',
    'admin2', 
    'dddwa-admin',
    'your-github-username',
    // Add more admin GitHub handles here
] as const
```

## Routes
## Features

The admin area includes the following routes:

- `/auth/login` - Login page with GitHub authentication (uses Panda CSS styled system)
- `/auth/github/callback` - GitHub OAuth callback
- `/auth/logout` - Logout (POST only)
- `/admin` - Main admin dashboard with responsive navigation
- `/admin/content` - Content management interface
- `/admin/events` - Event management interface

### UI Components

The admin area is built using:
- Panda CSS styled system with `Box`, `Flex`, `Grid` components
- Styled HTML elements using `styled.h1`, `styled.button`, etc.
- React Router's `NavLink` for navigation
- Responsive design with Panda CSS breakpoints

## Usage

1. Navigate to `/auth/login`
2. Click "Sign in with GitHub"
3. Authorize the application
4. You'll be redirected to `/admin` if your GitHub username is in the admin list
5. Use the navigation to access different admin sections

## Security Features

- Server-side session management with React Router cookie sessions
- GitHub OAuth2 authentication with latest remix-auth API
- Admin role validation on every protected request
- Secure cookie configuration (httpOnly, secure in production)
- Protected routes that redirect to login
- Manual session handling (no automatic redirects)

## Customization

### Adding New Admin Users

Edit the `ADMIN_HANDLES` array in `config.server.ts`:

```typescript
export const ADMIN_HANDLES = [
    'existing-admin',
    'new-admin-username',
] as const
```

### Adding New Admin Routes

1. Create a new route file in `app/routes/admin.{section}.tsx`
2. Use the `requireAdmin` function from `lib/auth.server.ts` in your loader
3. Add navigation links in `app/routes/admin.tsx`
4. Use Panda CSS components for styling

Example:

```typescript
// app/routes/admin.newfeature.tsx
import type { LoaderFunctionArgs } from 'react-router'
import { useLoaderData } from 'react-router'
import { requireAdmin, type User } from '~/lib/auth.server'
import { Box, Flex } from '~/styled-system/jsx'
import { styled } from '~/styled-system/jsx'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request)
  return { user }
}

export default function AdminNewFeature() {
  const { user } = useLoaderData<{ user: User }>()
  
  return (
    <Box p="8">
      <Box maxW="1200px" mx="auto" bg="white" borderRadius="lg" p="8">
        <styled.h1 mb="6" color="#0E0E43" fontSize="3xl" fontWeight="bold">
          New Feature Admin
        </styled.h1>
        {/* Your admin interface here using Panda CSS */}
      </Box>
    </Box>
  )
}
```

## Troubleshooting

### "Access denied" error
- Check that your GitHub username is in the `ADMIN_HANDLES` array
- Ensure the username matches exactly (case-sensitive)

### OAuth callback errors
- Verify the callback URL in your GitHub OAuth app matches your `WEB_URL`
- Check that `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correctly set

### Session issues
- Ensure `SESSION_SECRET` is set and consistent across deployments
- Check that cookies are enabled in your browser

### Build errors
- Run `pnpm install` to ensure all dependencies are installed
- Check TypeScript compilation with `pnpm run build-tsc`
- Ensure you're using `styled.element` instead of `as` prop with Panda CSS
- Use `Response.json()` instead of `json()` from react-router

## Development

For local development:

1. Set up a GitHub OAuth app with callback URL `http://localhost:3800/auth/github/callback`
2. Use the development environment variables
3. Add your GitHub username to the admin list
4. Start the development server: `pnpm start`

## Production Deployment

1. Create a production GitHub OAuth app with your production callback URL
2. Set production environment variables
3. Deploy the application
4. Test the admin authentication flow
5. Verify Panda CSS styles are properly built and served

## Technical Implementation Notes

### Authentication Flow
- Uses latest remix-auth v4+ API with manual session handling
- GitHub OAuth strategy fetches user profile and email separately
- Session storage using React Router's cookie session storage
- Manual redirect handling (no automatic redirects from authenticator)

### Styling Approach
- Built with Panda CSS styled system
- Uses `Box`, `Flex`, `Grid` for layout components
- Uses `styled.h1`, `styled.button`, etc. for semantic HTML elements
- Responsive design with Panda CSS breakpoints (`columns={{ base: 1, md: 3 }}`)
- Hover states and interactions using `_hover` prop
