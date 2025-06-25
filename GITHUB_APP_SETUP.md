# GitHub App Setup for DDD Admin Authentication

This document explains how to set up GitHub App authentication for the DDD website admin area using the new GitHub App manifest flow.

## What Was Changed

### New GitHub App Setup Script

A new script `scripts/setup-github-app.mjs` has been created that:

- **Uses GitHub's modern App manifest flow** instead of creating OAuth Apps
- **Provides a web-based UI** for easy setup at `http://localhost:3333`
- **Works with existing OAuth authentication code** - no code changes needed
- **Supports both local and production environments**
- **Automatically updates environment variables** and GitHub repository secrets
- **Each developer creates their own personal GitHub App** with their name/handle

### Key Benefits

1. **GitHub Apps are the recommended approach** - GitHub officially recommends Apps over OAuth Apps
2. **Better security** - More granular permissions and better audit trails
3. **Future-proof** - GitHub Apps support additional features like webhooks and installation tokens
4. **Same OAuth flow** - Your existing authentication code continues to work unchanged
5. **User-friendly setup** - Web interface instead of command-line prompts
6. **Personal apps** - Each developer creates their own app, no shared credentials
7. **Conflict-free** - Personalized app names prevent conflicts between developers

## Quick Start

### Prerequisites

**GitHub CLI Authentication Required:**

```bash
# Install GitHub CLI if not already installed
# macOS: brew install gh
# Windows: winget install GitHub.cli
# Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Authenticate with GitHub CLI (no Personal Access Token needed!)
gh auth login
```

### For Local Development

**⚠️ Important: Each developer should create their own personal GitHub App**

1. **Run the setup server:**

    ```bash
    node scripts/setup-github-app.mjs
    ```

2. **Open your browser** to `http://localhost:3333`

3. **Click "Local Development" tab** and create a GitHub App

    - **Customize the app name** to include your name/handle (e.g., "DDD Admin App (Local) - YourName")
    - This prevents conflicts with other developers' apps

4. **Install the app** to your personal account/organization

    - Click the "Install App" link after creation
    - Select the repositories you need access to

5. **Add your GitHub username** to admin handles in `website/app/lib/config.server.ts`

6. **Start the dev server:**

    ```bash
    pnpm start
    ```

7. **Test login** at `http://localhost:3800/auth/login`

8. **Optional - Enable content loading from your fork:**
    - Set `USE_GITHUB_CONTENT=true` in your `.env` file
    - The setup automatically configured `GITHUB_ORGANIZATION` to your username
    - Blog posts and content will now load from your GitHub fork instead of local files

### For Production

1. Follow the same steps but use the "Production" tab
2. **Customize the app name** to include your organization/team name
3. Provide your production domain and GitHub repository
4. The script automatically sets up GitHub repository secrets
5. **Install the production app** to your production organization
6. Deploy your application

**Note:** Production apps should be created by the team lead or DevOps team to avoid multiple production apps.

## How It Works

### GitHub App Manifest Flow

1. **Script generates a manifest** with your app configuration
2. **Redirects to GitHub** where you authorize app creation
3. **GitHub creates the app** and provides credentials
4. **Script receives credentials** and updates your environment
5. **App is ready to use** with OAuth authentication

### Authentication Flow (Unchanged)

The OAuth authentication flow remains exactly the same:

1. User clicks "Sign in with GitHub"
2. Redirects to GitHub OAuth authorization
3. User authorizes the app
4. GitHub redirects back with code
5. App exchanges code for access token
6. App fetches user profile and creates session

**The only difference:** GitHub Apps provide the OAuth credentials instead of OAuth Apps.

## Environment Variables

### Local Development (.env file)

```env
WEBSITE_GITHUB_APP_ID=123456
WEBSITE_GITHUB_APP_CLIENT_ID=Iv1.abc123def456
WEBSITE_GITHUB_APP_CLIENT_SECRET=ghp_abc123def456...
WEBSITE_GITHUB_APP_PRIVATE_KEY=LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ==
WEBSITE_GITHUB_APP_ORGANIZATION=your-username
USE_GITHUB_CONTENT=false
WEB_URL=http://localhost:3800
SESSION_SECRET=randomly-generated-secret
```

**Notes:**

- `GITHUB_PRIVATE_KEY` is automatically base64 encoded to prevent newline issues
- `GITHUB_ORGANIZATION` is automatically set to your username for fork development
- Set `USE_GITHUB_CONTENT=true` to load blog posts and content from your GitHub fork
- **These credentials are unique to your personal GitHub App** - never share them
- Each developer will have different values for these variables
- **No GITHUB_TOKEN required** - the setup script uses GitHub CLI for secure API access

### Production (GitHub Repository Secrets)

Same variables but stored as repository secrets for secure CI/CD deployment. The private key is automatically base64 encoded for both local and production environments.

## Environment Variable Configuration

The setup script automatically configures all required environment variables:

1. **Local development** - Updates your `.env` file automatically
2. **Production deployment** - Sets GitHub repository secrets automatically
3. **Base64 encoding** - Private keys are encoded to prevent formatting issues
4. **Backward compatibility** - Works with existing OAuth authentication code

## Troubleshooting

### Common Issues

**"GitHub CLI not available or not authenticated"**

- Install GitHub CLI: `brew install gh` (macOS) or visit https://cli.github.com
- Authenticate: `gh auth login`
- Verify: `gh auth status`

**"App permissions not working"**

- Ensure "Request user authorization (OAuth) during installation" is enabled
- Check OAuth scope includes `user:email`

**"Access denied" during login**

- Add your GitHub username to `ADMIN_HANDLES` in config
- Verify app has correct permissions

**"Authentication failed"**

- Check client ID and secret are correctly set
- Ensure callback URL matches your configuration

### Getting Help

1. **Check the web interface** - Shows created apps and next steps
2. **Review the logs** - Server shows detailed error messages
3. **Verify GitHub App settings** - Use the "Open App Settings" link
4. **Test OAuth flow manually** - Visit `/auth/login` to debug

## Security Considerations

- **Personal apps** - Each developer creates their own GitHub App with personal credentials
- **No shared secrets** - Developers never share GitHub App credentials
- **Environment separation** - Use different apps for local vs production
- **Credential security** - Never commit `.env` files, use repository secrets for production
- **Permission principle** - GitHub Apps use minimal required permissions
- **Private key encoding** - Private keys are base64 encoded to prevent formatting issues
- **Regular audits** - Review app permissions and access regularly
- **App naming** - Include your name/handle in app names to prevent conflicts

## Additional GitHub App Features

Beyond user authentication, GitHub Apps can also provide:

- **Webhooks** - Receive real-time notifications about repository events
- **Installation tokens** - Act on behalf of the app for repository operations
- **Organization-wide installation** - Install once, work across all repositories
- **Granular permissions** - Request only the specific permissions needed

## Next Steps

1. **Each developer sets up their own local GitHub App** using the new script
2. **Team lead configures production deployment** with production GitHub App credentials
3. **Add team members** to admin handles as needed
4. **Share the setup instructions** with new team members
5. **Consider additional GitHub App features** like webhooks or installation tokens

## Developer Onboarding

For new team members:

1. **Install and authenticate GitHub CLI:** `gh auth login`
2. **Clone the repository** and install dependencies
3. **Run the GitHub App setup script** to create your personal development app
4. **Include your name/handle** in the app name to avoid conflicts
5. **Install your app** to your personal GitHub account
6. **Add your GitHub username** to the admin handles list
7. **Start developing** with your own secure GitHub App credentials

**Never share GitHub App credentials between developers** - each person should have their own app.

## Technical Details

### GitHub App Benefits

| Feature        | Benefit                            |
| -------------- | ---------------------------------- |
| Permissions    | Granular, repository-level control |
| Rate Limits    | 5,000 requests/hour (5x higher)    |
| Installation   | Organization-wide deployment       |
| Webhooks       | Built-in event handling            |
| Security       | Better audit trails and isolation  |
| Future-proof   | GitHub's recommended approach      |
| Authentication | Uses GitHub CLI (no PAT required)  |

### Files Modified

- `scripts/setup-github-app.mjs` - GitHub App setup script with base64 private key encoding
- `scripts/README.md` - Complete setup documentation
- `website/.env.example` - GitHub App variables with encoding notes
- `website/app/lib/config.server.ts` - GitHub App config support and private key decoder

### Files Unchanged

- `website/app/lib/auth.server.ts` - OAuth flow unchanged
- `website/app/routes/auth.*.tsx` - Authentication routes unchanged
- All other application code - No changes needed

GitHub Apps provide OAuth credentials that work seamlessly with your existing authentication code, giving you all the benefits of modern GitHub Apps without requiring any code changes.
