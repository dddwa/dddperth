# GitHub App Setup for DDD Admin Authentication

This directory contains the script to automate the setup of GitHub App authentication for the DDD admin area.

## GitHub App Setup Script

### `setup-github-app.mjs`

**Modern GitHub App setup using the manifest flow**

Creates GitHub Apps that provide OAuth credentials for user authentication. GitHub Apps are the modern, recommended approach for GitHub integrations.

#### Usage

```bash
node scripts/setup-github-app.mjs
```

This starts a web server at `http://localhost:3333` with a user-friendly interface to:
- Create GitHub Apps for local development
- Create GitHub Apps for production
- View created apps and their configuration

#### Benefits of GitHub Apps
- Granular, repository-level permissions
- Better security model and audit trails
- Can act on behalf of the app itself
- Official GitHub recommendation for new integrations
- **Works with your existing OAuth authentication flow**
- Higher rate limits (5,000 vs 1,000 requests/hour)

#### Features
- **Web-based setup**: Clean UI for creating apps
- **Manifest flow**: Uses GitHub's official app creation process
- **Automatic configuration**: Updates `.env` files and GitHub secrets
- **Environment separation**: Separate apps for local and production
- **Visual feedback**: See created apps and their configuration
- **Base64 private keys**: Prevents newline issues in environment variables
- **Fork-aware setup**: Automatically configures local development to point to your fork

## Recommended Workflow

### For Local Development

1. **Start the GitHub App setup server:**
   ```bash
   node scripts/setup-github-app.mjs
   ```

2. **Open your browser** to `http://localhost:3333`

3. **Create a local GitHub App:**
   - Click the "Local Development" tab
   - Keep the default settings (or customize as needed)
   - Click "Create Local GitHub App"
   - Follow the GitHub redirect to authorize the app creation

4. **Configure permissions:**
   - After creation, click "Open App Settings"
   - Ensure "Request user authorization (OAuth) during installation" is enabled
   - Verify OAuth scope includes `user:email`

5. **Add your GitHub username** to admin handles in `website/app/lib/config.server.ts`:
   ```typescript
   export const ADMIN_HANDLES = [
       'your-github-username',
       // ... other admins
   ] as const
   ```

6. **Start development server:**
   ```bash
   pnpm start
   ```

7. **Test admin login** at `http://localhost:3800/auth/login`

8. **Optional - Enable content from your fork:**
   - The setup automatically set `GITHUB_ORGANIZATION` to your username
   - Set `USE_GITHUB_CONTENT=true` in `.env` to load blog posts from your GitHub fork
   - Leave as `false` to use local content files

### For Production

1. **Start the GitHub App setup server:**
   ```bash
   node scripts/setup-github-app.mjs
   ```

2. **Create a production GitHub App:**
   - Click the "Production" tab
   - Enter your production domain (e.g., `https://dddperth.com/`)
   - Optionally provide GitHub repository for automatic secret management
   - Click "Create Production GitHub App"

3. **Configure app permissions** (same as local setup)

4. **Set up deployment:**
   - If you provided a GitHub repository, secrets are automatically set
   - Otherwise, manually configure your deployment with the app credentials

5. **Deploy your application**

## Environment Variables

### GitHub App Credentials

#### Local (`.env` file)
- `GITHUB_APP_ID` - GitHub App identifier
- `GITHUB_CLIENT_ID` - OAuth client ID (for user authentication)
- `GITHUB_CLIENT_SECRET` - OAuth client secret (for user authentication)
- `GITHUB_PRIVATE_KEY` - App private key (base64 encoded to prevent newline issues)
- `GITHUB_ORGANIZATION` - Set to your username for local fork development
- `USE_GITHUB_CONTENT` - Set to `true` to load content from GitHub (defaults to `false`)
- `WEB_URL` - Your website URL
- `SESSION_SECRET` - Generated session secret

#### Production (GitHub Secrets)
Same variables but stored as repository secrets for CI/CD deployment. The private key is automatically base64 encoded for both environments.

## Authentication Flow

The OAuth authentication flow for users:

1. User clicks "Sign in with GitHub"
2. Redirects to GitHub OAuth authorization
3. User authorizes the app
4. GitHub redirects back with authorization code
5. App exchanges code for access token
6. App fetches user profile and email
7. App creates user session

**GitHub Apps provide OAuth credentials that work with your existing authentication code.**

## Security Notes

- **Never commit your `.env` file** - it contains sensitive credentials
- Each environment (local/production) should have its own app
- Production secrets should be stored in GitHub repository secrets
- Session secrets are randomly generated for each environment
- GitHub Apps provide better security isolation and audit trails
- Private keys are base64 encoded to prevent formatting issues

## Troubleshooting

### GitHub App Setup Issues

**"Manifest conversion failed"**
- Ensure you're using a valid redirect URL
- Check that the GitHub App manifest is properly formatted
- Try refreshing the setup page and creating again

**"App permissions not working"**
- Verify "Request user authorization (OAuth) during installation" is enabled
- Check that OAuth scope includes `user:email`
- Ensure the app has proper account permissions

### General Authentication Issues

**"Access denied" error**
- Add your GitHub username to `ADMIN_HANDLES` in `website/app/lib/config.server.ts`
- Verify the app has correct permissions
- Check that OAuth callback URL matches your configuration

**"Authentication failed" error**
- Verify client ID and secret are correctly set
- Check that the app is configured for the correct environment
- Ensure OAuth callback URL is accessible

**"Failed to set GitHub secrets"**
- Ensure you have admin access to the repository
- Check that the repository exists and the format is correct (`owner/repo`)
- You may need to set secrets manually in repository settings

## Manual Setup

If you prefer manual setup, you can create GitHub Apps manually:

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Configure OAuth settings and permissions:
   - Set authorization callback URL to `{your-url}/auth/github/callback`
   - Enable "Request user authorization (OAuth) during installation"
   - Set OAuth scope to `user:email`
   - Set account permissions → Metadata: Read
4. Copy the credentials to your environment variables

## Using the Private Key

If you need to use the GitHub App private key for app-level operations:

```typescript
import { getGitHubPrivateKey } from '~/lib/config.server'

const privateKey = getGitHubPrivateKey() // Automatically decodes from base64
if (privateKey) {
  // Use with @octokit/app or similar for GitHub App API calls
  const app = new App({
    appId: GITHUB_APP_ID,
    privateKey,
  })
}
```

The `getGitHubPrivateKey()` function automatically handles base64 decoding and error handling.

## Content Loading from Your Fork

For local development, the GitHub App setup automatically configures content loading from your fork:

1. **Automatic Organization Setup**: `GITHUB_ORGANIZATION` is set to your username
2. **Content Permissions**: The app requests repository content read permissions
3. **Opt-in Content Loading**: Set `USE_GITHUB_CONTENT=true` to load from your fork
4. **Local Development**: Keep `USE_GITHUB_CONTENT=false` to use local files

This allows you to:
- Test blog posts and content changes from your fork
- Develop with realistic content without local files
- Switch between local and fork content easily
