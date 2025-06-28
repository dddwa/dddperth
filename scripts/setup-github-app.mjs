#!/usr/bin/env node

import { execSync } from 'child_process'
import crypto from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import http from 'http'
import { dirname, join } from 'path'
import querystring from 'querystring'
import url, { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
}

// Print functions
const print = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
}

// Configuration
const config = {
    appName: 'DDD Admin App',
    description: 'GitHub App for DDD website admin authentication',
    envFile: join(__dirname, '../website/.env'),
    envExampleFile: join(__dirname, '../website/.env.example'),
    port: 3333,
}

// No need to store app configurations in memory since we write them to:
// - Local .env file (for development apps)
// - GitHub repository variables/secrets (for production apps)

// Helper function to parse .env file
function parseEnvFile(filePath) {
    if (!existsSync(filePath)) {
        return {}
    }

    const content = readFileSync(filePath, 'utf8')
    const env = {}

    content.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=')
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim()
            }
        }
    })

    return env
}

// Helper function to fetch GitHub repository variables and secrets using GH CLI
async function fetchGitHubRepoInfo(repoOwner, repoName) {
    try {
        // Check if GitHub CLI is available and authenticated
        execSync('gh auth status', { stdio: 'ignore' })

        const variables = {}
        const secretNames = []

        // Fetch repository variables using GH CLI
        try {
            const variablesOutput = execSync(`gh api repos/${repoOwner}/${repoName}/actions/variables`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            })
            const variablesData = JSON.parse(variablesOutput)
            variablesData.variables?.forEach((variable) => {
                variables[variable.name] = variable.value
            })
        } catch (error) {
            // Variables endpoint might not exist or no access
        }

        // Fetch repository secrets list using GH CLI
        try {
            const secretsOutput = execSync(`gh api repos/${repoOwner}/${repoName}/actions/secrets`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
            })
            const secretsData = JSON.parse(secretsOutput)
            secretsData.secrets?.forEach((secret) => {
                secretNames.push(secret.name)
            })
        } catch (error) {
            // Secrets endpoint might not exist or no access
        }

        return { variables, secretNames }
    } catch (error) {
        print.warning(`GitHub CLI not available or not authenticated: ${error.message}`)
        print.info('Run "gh auth login" to authenticate with GitHub CLI')
        return { variables: {}, secretNames: [] }
    }
}

// Check GitHub CLI status and permissions
async function checkGitHubCLIStatus() {
    try {
        // Check if GitHub CLI is available
        execSync('gh --version', { stdio: 'ignore' })
    } catch (error) {
        return {
            available: false,
            authenticated: false,
            hasRepoAccess: false,
            error: 'GitHub CLI is not installed. Install it from https://cli.github.com/',
            username: null,
        }
    }

    try {
        // Check if authenticated
        execSync('gh auth status', { stdio: 'ignore' })
    } catch (error) {
        return {
            available: true,
            authenticated: false,
            hasRepoAccess: false,
            error: 'GitHub CLI is not authenticated. Run "gh auth login" to authenticate.',
            username: null,
        }
    }

    // Get username
    let username = null
    try {
        username = execSync('gh api user --jq .login', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()
    } catch (error) {
        // Username fetch failed but auth is working
    }

    // Check repository access for production setup
    let hasRepoAccess = false
    try {
        execSync('gh repo view "dddwa/dddperth" --json nameWithOwner', { stdio: 'ignore' })
        hasRepoAccess = true
    } catch (error) {
        // No access to production repository
    }

    return {
        available: true,
        authenticated: true,
        hasRepoAccess,
        error: null,
        username,
    }
}

// Function to read existing GitHub App configurations
async function getExistingAppConfigs() {
    const configs = []

    // Read from local .env file
    const localEnv = parseEnvFile(config.envFile)
    if (localEnv.WEBSITE_GITHUB_APP_ID) {
        const appSlug = localEnv.WEBSITE_GITHUB_APP_SLUG || null
        if (!appSlug) {
            print.warning('Local app slug not found in .env file')
        }

        configs.push({
            id: localEnv.WEBSITE_GITHUB_APP_ID,
            client_id: localEnv.WEBSITE_GITHUB_APP_CLIENT_ID || 'Not set',
            name: 'Local Development App',
            environment: 'local',
            homepage_url:
                localEnv.WEB_URL && localEnv.WEB_URL.startsWith('http')
                    ? localEnv.WEB_URL
                    : `http://${localEnv.WEB_URL || 'localhost:3800'}`,
            setup_url: appSlug ? `https://github.com/apps/${appSlug}` : null,
            install_url: appSlug ? `https://github.com/apps/${appSlug}/installations/new` : null,
            app_slug: appSlug,
            source: '.env file',
            organization: localEnv.GITHUB_ORGANIZATION,
            hasAllCredentials: !!(
                localEnv.WEBSITE_GITHUB_APP_ID &&
                localEnv.WEBSITE_GITHUB_APP_CLIENT_ID &&
                localEnv.WEBSITE_GITHUB_APP_CLIENT_SECRET &&
                localEnv.WEBSITE_GITHUB_APP_PRIVATE_KEY
            ),
        })
    }

    // Try to read from GitHub repository if we have GitHub CLI access
    try {
        // Parse repository from current directory or environment
        const repoInfo = await detectRepositoryInfo()
        if (repoInfo) {
            const { variables, secretNames } = await fetchGitHubRepoInfo(repoInfo.owner, repoInfo.repo)

            if (variables.WEBSITE_GITHUB_APP_ID || secretNames.includes('WEBSITE_GITHUB_APP_ID')) {
                const appId = variables.WEBSITE_GITHUB_APP_ID || 'Set as secret'
                // App slug is optional - just for convenience links
                const appSlug = variables.WEBSITE_GITHUB_APP_SLUG || null

                configs.push({
                    id: appId,
                    client_id:
                        variables.WEBSITE_GITHUB_APP_CLIENT_ID ||
                        (secretNames.includes('WEBSITE_GITHUB_APP_CLIENT_ID') ? 'Set as variable' : 'Not set'),
                    name: 'Production App',
                    environment: 'production',
                    homepage_url: variables.WEB_URL || 'Not set',
                    setup_url: appSlug ? `https://github.com/apps/${appSlug}` : null,
                    install_url: appSlug ? `https://github.com/apps/${appSlug}/installations/new` : null,
                    app_slug: appSlug,
                    source: `GitHub Repository (${repoInfo.owner}/${repoInfo.repo})`,
                    repository: `${repoInfo.owner}/${repoInfo.repo}`,
                    hasSecrets: secretNames.filter((name) => name.startsWith('WEBSITE_GITHUB_APP_')).length > 0,
                    hasAllCredentials: !!(
                        (variables.WEBSITE_GITHUB_APP_ID || secretNames.includes('WEBSITE_GITHUB_APP_ID')) &&
                        (variables.WEBSITE_GITHUB_APP_CLIENT_ID ||
                            secretNames.includes('WEBSITE_GITHUB_APP_CLIENT_ID')) &&
                        secretNames.includes('WEBSITE_GITHUB_APP_CLIENT_SECRET') &&
                        secretNames.includes('WEBSITE_GITHUB_APP_PRIVATE_KEY')
                    ),
                })
            }
        }
    } catch (error) {
        print.warning(`Could not read from GitHub repository: ${error.message}`)
        print.info('Ensure GitHub CLI is installed and authenticated: gh auth login')
    }

    return configs
}

// Helper function to detect repository information
async function detectRepositoryInfo() {
    try {
        // Try to get from git remote
        const remoteUrl = execSync('git remote get-url origin', { cwd: __dirname, encoding: 'utf8' }).trim()
        const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
        if (match) {
            return { owner: match[1], repo: match[2] }
        }
    } catch (error) {
        // Fallback to environment or manual detection
    }

    // Could also check package.json repository field, etc.
    return null
}

// Helper function to parse request body
async function parseBody(req) {
    return new Promise((resolve) => {
        let body = ''
        req.on('data', (chunk) => {
            body += chunk.toString()
        })
        req.on('end', () => {
            const contentType = req.headers['content-type'] || ''
            if (contentType.includes('application/json')) {
                try {
                    resolve(JSON.parse(body))
                } catch {
                    resolve({})
                }
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                resolve(querystring.parse(body))
            } else {
                resolve({})
            }
        })
    })
}

// Helper function to send JSON response
function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(data))
}

// Helper function to send HTML response
function sendHTML(res, html, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(html)
}

// Load template files
const templatesDir = join(__dirname, 'templates')
const setupPageHTML = readFileSync(join(templatesDir, 'setup-page.html'), 'utf8')
const successPageTemplate = readFileSync(join(templatesDir, 'success-page.html'), 'utf8')
const cssContent = readFileSync(join(templatesDir, 'github-app-setup.css'), 'utf8')
const jsContent = readFileSync(join(templatesDir, 'github-app-setup.js'), 'utf8')

// Create HTTP server
function createServer() {
    return http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url, true)
        const { pathname, query } = parsedUrl
        const method = req.method.toLowerCase()

        // Add CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (method === 'options') {
            res.writeHead(200)
            res.end()
            return
        }

        try {
            // Routes
            if (pathname === '/' && method === 'get') {
                sendHTML(res, setupPageHTML)
            } else if (pathname === '/static/github-app-setup.css' && method === 'get') {
                res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' })
                res.end(cssContent)
            } else if (pathname === '/static/github-app-setup.js' && method === 'get') {
                res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' })
                res.end(jsContent)
            } else if (pathname === '/created-apps' && method === 'get') {
                // Get all existing configurations from .env and GitHub
                const allConfigs = await getExistingAppConfigs()
                sendJSON(res, allConfigs)
            } else if (pathname === '/github-status' && method === 'get') {
                // Check GitHub CLI authentication status
                const status = await checkGitHubCLIStatus()
                sendJSON(res, status)
            } else if (pathname === '/github-username' && method === 'get') {
                // Get GitHub username for local development app naming (optional)
                try {
                    const ghUsername = execSync('gh api user --jq .login', {
                        encoding: 'utf8',
                        stdio: ['ignore', 'pipe', 'ignore'],
                    }).trim()
                    sendJSON(res, { username: ghUsername || null })
                } catch (error) {
                    // GitHub CLI not available or not authenticated - that's fine
                    sendJSON(res, { username: null })
                }
            } else if (pathname === '/setup-env' && method === 'post') {
                const body = await parseBody(req)
                const { app, config } = body

                try {
                    if (config.environment === 'local') {
                        // For local development, fetch app owner info to set GITHUB_ORGANIZATION
                        const userInfo = await fetchAppOwnerInfo(app)
                        updateLocalEnv(app, config.homepageUrl, userInfo)
                        print.success('Local environment setup completed successfully')
                    } else {
                        // For production, set both variables and secrets
                        await setGitHubVariables(app, config.homepageUrl, config.githubRepo)
                        await setGitHubSecrets(app, config.homepageUrl, config.githubRepo)
                        print.success('Production environment setup completed successfully')
                    }

                    sendJSON(res, { success: true, environment: config.environment })
                } catch (error) {
                    print.error(`Setup failed: ${error.message}`)
                    sendJSON(res, { success: false, message: error.message }, 200)
                }
            } else if (pathname === '/callback' && method === 'get') {
                const { code, state, installation_id, setup_action } = query

                // Handle installation callback (after installing the app)
                if (installation_id && setup_action === 'install') {
                    try {
                        // Save installation ID to .env file
                        updateLocalEnvVar('WEBSITE_GITHUB_APP_INSTALLATION_ID', installation_id)
                        print.success(`Saved installation ID ${installation_id} to .env file`)
                    } catch (error) {
                        print.warning(`Could not save installation ID to .env: ${error.message}`)
                    }

                    // Also try to save to GitHub repository variables for production
                    try {
                        const repoInfo = await detectRepositoryInfo()
                        if (repoInfo) {
                            const githubRepo = `${repoInfo.owner}/${repoInfo.repo}`
                            await setGitHubInstallationId(installation_id, githubRepo)
                        } else {
                            print.info('Could not detect repository info - skipping GitHub variable setup')
                        }
                    } catch (error) {
                        print.warning(`Could not save installation ID to GitHub variables: ${error.message}`)
                    }

                    sendHTML(
                        res,
                        `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>App Installed Successfully</title>
                            <link rel="stylesheet" href="/static/github-app-setup.css">
                        </head>
                        <body>
                            <div class="success-box">
                                <h1>✅ GitHub App Installed Successfully!</h1>
                                <p>Your GitHub App has been installed to the selected repository.</p>
                                <p><strong>Installation ID:</strong> ${installation_id}</p>
                                
                                <div class="info-box">
                                    <p><strong>Next Steps:</strong></p>
                                    <ul>
                                        <li>Your app is now ready to access repository content</li>
                                        <li>Installation ID has been automatically saved to your .env file</li>
                                        <li>Installation ID has been saved to GitHub repository variables for production</li>
                                        <li>For local development: Set <code>USE_GITHUB_CONTENT=true</code> in your .env file to load content from GitHub</li>
                                        <li>Start your development server: <code>pnpm start</code></li>
                                    </ul>
                                </div>
                                
                                <p><a href="/?tab=created" class="button">Back to Created Apps</a></p>
                            </div>
                        </body>
                        </html>
                    `,
                    )
                    return
                }

                // Handle app creation callback
                if (!code || !state) {
                    sendHTML(res, 'Missing required parameters', 400)
                    return
                }

                try {
                    // Exchange code for app details
                    const response = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/vnd.github.v3+json',
                            'User-Agent': 'DDD-GitHub-App-Setup',
                        },
                    })

                    if (!response.ok) {
                        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
                    }

                    const app = await response.json()

                    // Render success page from template
                    const successHTML = successPageTemplate
                        .replace(/{{appName}}/g, app.name)
                        .replace(/{{appId}}/g, app.id)
                        .replace(/{{clientId}}/g, app.client_id)
                        .replace(/{{appSlug}}/g, app.slug)
                        .replace(/{{appDataJson}}/g, JSON.stringify(app))

                    sendHTML(res, successHTML)
                } catch (error) {
                    print.error(`Failed to create GitHub App: ${error.message}`)
                    sendHTML(res, `<h2>Error</h2><p>${error.message}</p>`, 500)
                }
            } else {
                sendHTML(res, '<h1>404 Not Found</h1>', 404)
            }
        } catch (error) {
            print.error(`Server error: ${error.message}`)
            sendJSON(res, { error: 'Internal server error' }, 500)
        }
    })
}

// Update environment variable in .env file
function updateEnvVar(content, varName, varValue) {
    const regex = new RegExp(`^${varName}=.*$`, 'm')
    const newLine = `${varName}=${varValue}`

    if (regex.test(content)) {
        return content.replace(regex, newLine)
    } else {
        return content + (content.endsWith('\n') ? '' : '\n') + newLine + '\n'
    }
}

// Update a single environment variable in .env file
function updateLocalEnvVar(varName, varValue) {
    print.info(`Updating ${varName} in local .env file...`)

    let envContent = ''

    // Create .env file if it doesn't exist
    if (!existsSync(config.envFile)) {
        print.warning('.env file not found, creating from .env.example')
        if (existsSync(config.envExampleFile)) {
            envContent = readFileSync(config.envExampleFile, 'utf8')
        }
    } else {
        envContent = readFileSync(config.envFile, 'utf8')
    }

    // Update the specific variable
    envContent = updateEnvVar(envContent, varName, varValue)

    writeFileSync(config.envFile, envContent)
    print.success(`${varName} updated in .env file`)
}

// Fetch app owner information using GitHub App details
async function fetchAppOwnerInfo(app) {
    try {
        print.info('Fetching app owner information for local development setup...')

        // Get app installation info to determine the owner
        const ownerLogin = app.owner?.login
        if (ownerLogin) {
            print.success(`App owner detected: ${ownerLogin}`)
            return {
                username: ownerLogin,
                name: app.owner?.name || ownerLogin,
            }
        }

        print.warning('Could not determine app owner from GitHub response')
        print.info('GITHUB_ORGANIZATION will remain as "dddwa" (default)')
        print.info('To use your fork: manually set GITHUB_ORGANIZATION=your-username in .env')
        return null
    } catch (error) {
        print.warning(`Could not fetch app owner info: ${error.message}`)
        print.info('GITHUB_ORGANIZATION will remain as "dddwa" (default)')
        print.info('To use your fork: manually set GITHUB_ORGANIZATION=your-username in .env')
        return null
    }
}

// Update local .env file
function updateLocalEnv(app, homepageUrl, userInfo = null) {
    print.info('Updating local .env file...')

    let envContent = ''

    // Create .env file if it doesn't exist
    if (!existsSync(config.envFile)) {
        print.warning('.env file not found, creating from .env.example')
        if (existsSync(config.envExampleFile)) {
            envContent = readFileSync(config.envExampleFile, 'utf8')
        }
    } else {
        envContent = readFileSync(config.envFile, 'utf8')
    }

    // Update GitHub App variables (OAuth credentials for user authentication)
    envContent = updateEnvVar(envContent, 'WEBSITE_GITHUB_APP_ID', app.id.toString())
    envContent = updateEnvVar(envContent, 'WEBSITE_GITHUB_APP_CLIENT_ID', app.client_id)
    envContent = updateEnvVar(envContent, 'WEBSITE_GITHUB_APP_CLIENT_SECRET', app.client_secret)
    // Private key base64 encoded to prevent newline issues
    const privateKeyBase64 = Buffer.from(app.pem).toString('base64')
    envContent = updateEnvVar(envContent, 'WEBSITE_GITHUB_APP_PRIVATE_KEY', privateKeyBase64)

    // Save the app slug if available
    if (app.slug) {
        envContent = updateEnvVar(envContent, 'WEBSITE_GITHUB_APP_SLUG', app.slug)
    } else {
        print.warning('App slug not found, skipping WEBSITE_GITHUB_APP_SLUG update')
    }

    // Update GITHUB_ORGANIZATION for local development if we have user info
    if (userInfo && userInfo.username) {
        envContent = updateEnvVar(envContent, 'GITHUB_ORGANIZATION', userInfo.username)
        print.success(`Set GITHUB_ORGANIZATION to your username: ${userInfo.username}`)
        print.info('This points to your fork for local development')
        print.info('Set USE_GITHUB_CONTENT=true in .env to load content from your fork')
    } else {
        print.info('GITHUB_ORGANIZATION remains set to "dddwa" (default)')
        print.info('If you have a fork, manually update GITHUB_ORGANIZATION=your-username in .env')
    }

    // Ensure other required variables exist
    if (!envContent.includes('WEB_URL=')) {
        envContent = updateEnvVar(envContent, 'WEB_URL', homepageUrl)
    }

    if (!envContent.includes('SESSION_SECRET=')) {
        const sessionSecret = crypto.randomBytes(32).toString('hex')
        envContent = updateEnvVar(envContent, 'SESSION_SECRET', sessionSecret)
    }

    writeFileSync(config.envFile, envContent)
    print.success('Local .env file updated')
}

// Set GitHub repository secrets
async function setGitHubVariables(app, homepageUrl, githubRepo) {
    if (!githubRepo?.trim()) {
        print.info('Skipping GitHub variables (no repository specified)')
        return
    }

    print.info('Setting GitHub repository variables...')

    try {
        // Check if GitHub CLI is available
        execSync('gh --version', { stdio: 'ignore' })

        // Check auth status and permissions
        try {
            execSync('gh auth status', { stdio: 'ignore' })
        } catch (authError) {
            print.error('GitHub CLI is not authenticated. Run "gh auth login" first.')
            return
        }

        // Check if user has access to the repository
        try {
            execSync(`gh repo view "${githubRepo}" --json nameWithOwner`, { stdio: 'ignore' })
        } catch (repoError) {
            print.error(`Cannot access repository "${githubRepo}". Check your permissions.`)
            print.info('You need admin access to set variables and secrets.')
            return
        }

        // Set public variables (non-sensitive)
        // Using WEBSITE_GITHUB_APP_ prefix to avoid GitHub's GITHUB_ reserved namespace
        // These get mapped back to GITHUB_ variables in the CI/CD workflow
        execSync(`echo "${app.id}" | gh variable set WEBSITE_GITHUB_APP_ID --repo "${githubRepo}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        execSync(`echo "${app.client_id}" | gh variable set WEBSITE_GITHUB_APP_CLIENT_ID --repo "${githubRepo}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        execSync(`echo "${homepageUrl}" | gh variable set WEB_URL --repo "${githubRepo}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        // Also save the app slug if available
        if (app.slug) {
            execSync(`echo "${app.slug}" | gh variable set WEBSITE_GITHUB_APP_SLUG --repo "${githubRepo}"`, {
                stdio: ['pipe', 'pipe', 'pipe'],
            })
        }

        print.success('GitHub variables set successfully')
        print.info('  WEBSITE_GITHUB_APP_ID: Set as variable')
        print.info('  WEBSITE_GITHUB_APP_CLIENT_ID: Set as variable')
        print.info('  WEB_URL: Set as variable')
        if (app.slug) {
            print.info('  WEBSITE_GITHUB_APP_SLUG: Set as variable')
        }
    } catch (error) {
        print.error(`Failed to set GitHub variables: ${error.message}`)
        print.warning('You may need to set these manually in your repository settings')
        print.info(`Repository: https://github.com/${githubRepo}/settings/variables/actions`)
    }
}

// Set GitHub installation ID as repository variable
async function setGitHubInstallationId(installationId, githubRepo) {
    if (!githubRepo?.trim()) {
        print.info('Skipping GitHub installation ID variable (no repository specified)')
        return
    }

    print.info('Setting GitHub installation ID variable...')

    try {
        // Check if GitHub CLI is available
        execSync('gh --version', { stdio: 'ignore' })
        execSync('gh auth status', { stdio: 'ignore' })

        // Set installation ID as a repository variable
        execSync(
            `echo "${installationId}" | gh variable set WEBSITE_GITHUB_APP_INSTALLATION_ID --repo "${githubRepo}"`,
            {
                stdio: 'ignore',
            },
        )

        print.success('GitHub installation ID variable set successfully')
        print.info('  WEBSITE_GITHUB_APP_INSTALLATION_ID: Set as variable')
    } catch (error) {
        print.error(`Failed to set GitHub installation ID variable: ${error.message}`)
        print.warning('You may need to set WEBSITE_GITHUB_APP_INSTALLATION_ID manually in your repository settings')
    }
}

async function setGitHubSecrets(app, homepageUrl, githubRepo) {
    if (!githubRepo?.trim()) {
        print.info('Skipping GitHub secrets (no repository specified)')
        return
    }

    print.info('Setting GitHub repository secrets...')

    try {
        // Check if GitHub CLI is available
        execSync('gh --version', { stdio: 'ignore' })

        // Check auth status and permissions
        try {
            execSync('gh auth status', { stdio: 'ignore' })
        } catch (authError) {
            print.error('GitHub CLI is not authenticated. Run "gh auth login" first.')
            return
        }

        // Check if user has access to the repository
        try {
            execSync(`gh repo view "${githubRepo}" --json nameWithOwner`, { stdio: 'ignore' })
        } catch (repoError) {
            print.error(`Cannot access repository "${githubRepo}". Check your permissions.`)
            print.info('You need admin access to set variables and secrets.')
            return
        }

        // Set the secrets (sensitive data only)
        execSync(
            `echo "${app.client_secret}" | gh secret set WEBSITE_GITHUB_APP_CLIENT_SECRET --repo "${githubRepo}"`,
            {
                stdio: ['pipe', 'pipe', 'pipe'],
            },
        )
        // Base64 encode private key to prevent newline issues in GitHub secrets
        const privateKeyBase64 = Buffer.from(app.pem).toString('base64')
        execSync(`echo "${privateKeyBase64}" | gh secret set WEBSITE_GITHUB_APP_PRIVATE_KEY --repo "${githubRepo}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        // Generate and set SESSION_SECRET for production
        const prodSessionSecret = crypto.randomBytes(32).toString('hex')
        execSync(`echo "${prodSessionSecret}" | gh secret set SESSION_SECRET --repo "${githubRepo}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
        })

        print.success('GitHub secrets set successfully')
        print.info('  WEBSITE_GITHUB_APP_CLIENT_SECRET: Set as secret')
        print.info('  WEBSITE_GITHUB_APP_PRIVATE_KEY: Set as secret (base64 encoded)')
        print.info('  SESSION_SECRET: Set as secret (generated for production)')
    } catch (error) {
        print.error(`Failed to set GitHub secrets: ${error.message}`)
        print.warning('You may need to set these manually in your repository settings')
        print.info(`Repository: https://github.com/${githubRepo}/settings/secrets/actions`)
    }
}

// Start server
function startServer() {
    const server = createServer()

    server.listen(config.port, () => {
        console.log()
        print.success('🚀 GitHub App Setup Server Started!')
        console.log()
        print.info(`Open your browser and go to: ${colors.blue}http://localhost:${config.port}${colors.reset}`)
        console.log()
        print.info('Follow the instructions to create your GitHub Apps')
        print.warning('Press Ctrl+C to stop the server when done')
        console.log()
    })

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log()
        print.info('Shutting down server...')
        server.close(() => {
            print.success('Setup complete!')
            process.exit(0)
        })
    })

    return server
}

// Show help
function showHelp() {
    console.log('GitHub App Setup Script')
    console.log('=======================')
    console.log()
    console.log('This script starts a web server to help you create GitHub Apps using the manifest flow.')
    console.log()
    console.log('Usage: node setup-github-app.mjs [options]')
    console.log()
    console.log('Options:')
    console.log('  --port <number>    Port to run the web server on (default: 3333)')
    console.log('  --help, -h         Show this help message')
    console.log()
    console.log('The server will start at http://localhost:3333 where you can:')
    console.log('  • Create personal GitHub Apps for local development')
    console.log('  • Create GitHub Apps for production')
    console.log('  • View all apps from .env files and GitHub repository')
    console.log('  • Track persistent app configurations across sessions')
    console.log('')
    console.log('Important: Each developer should create their own personal GitHub App')
    console.log('  • Include your name/handle in the app name (e.g., "DDD App - YourName")')
    console.log('  • Never share GitHub App credentials between developers')
    console.log('  • Each app should be installed to your personal account/organization')
    console.log()
    console.log('Prerequisites:')
    console.log('  • GitHub CLI installed and authenticated (run "gh auth login")')
    console.log('  • No Personal Access Token required - uses GitHub CLI for API calls')
    console.log()
    console.log('GitHub App Benefits:')
    console.log('  • Modern, recommended approach by GitHub')
    console.log('  • Granular, repository-level permissions')
    console.log('  • Higher rate limits (5,000 vs 1,000 requests/hour)')
    console.log('  • Works seamlessly with existing OAuth authentication code')
    console.log('  • Supports webhooks and advanced integrations')
    console.log('  • Private keys are automatically base64 encoded to prevent newline issues')
    console.log('  • Automatically configures local development to use your fork')
    console.log('  • App IDs stored as repository variables (public)')
    console.log('  • Secrets stored as repository secrets (encrypted)')
    console.log('  • Persistent tracking across development sessions')
    console.log('  • Each developer creates their own personalized app')
    console.log('  • No shared credentials - better security and conflict prevention')
    console.log('  • Uses GitHub CLI for secure API access (no PAT required)')
    console.log()
}

// Main function
function main() {
    const args = process.argv.slice(2)

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        switch (arg) {
            case '--port':
                config.port = parseInt(args[++i]) || config.port
                break
            case '--help':
            case '-h':
                showHelp()
                return
            default:
                if (arg.startsWith('-')) {
                    print.error(`Unknown option: ${arg}`)
                    print.info("Run 'node setup-github-app.mjs --help' for usage information")
                    return
                }
                break
        }
    }

    startServer()
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    print.error(`Uncaught exception: ${error.message}`)
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    print.error(`Unhandled rejection at ${promise}: ${reason}`)
    process.exit(1)
})

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main()
}
