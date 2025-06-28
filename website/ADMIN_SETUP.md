# Admin Area Setup Guide

This guide will help you set up and configure the admin area for the DDD website.

## Prerequisites

- GitHub OAuth App configured
- Environment variables properly set
- Node.js and pnpm installed
- Panda CSS configured (already included in the project)

## GitHub OAuth Setup

Follow the instructions in [GITHUB_APP_SETUP.md](GITHUB_APP_SETUP.md) to create a GitHub App.

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

## Troubleshooting

### "Access denied" error

- Check that your GitHub username is in the `ADMIN_HANDLES` array
- Ensure the username matches exactly (case-sensitive)

### OAuth callback errors

- Verify the callback URL in your GitHub OAuth app matches your `WEB_URL`
- Check that `WEBSITE_GITHUB_APP_CLIENT_ID` and `WEBSITE_GITHUB_APP_CLIENT_SECRET` are correctly set

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
