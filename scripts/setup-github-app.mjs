#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import http from 'http'
import url from 'url'
import querystring from 'querystring'

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

// Store app configurations temporarily
const appConfigs = new Map()

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

// HTML template for the setup page
const setupPageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub App Setup</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .container {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 8px;
            margin: 20px 0;
        }
        h1 {
            color: #24292f;
            margin-bottom: 8px;
            font-size: 28px;
            font-weight: 700;
        }
        .subtitle {
            color: #656d76;
            margin-bottom: 30px;
            font-size: 16px;
            font-weight: 400;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        input, select, textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
        }
        textarea {
            height: 80px;
            resize: vertical;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .checkbox-group input {
            width: auto;
        }
        button {
            background: #0366d6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        }
        button:hover {
            background: #0256cc;
        }
        .info-box {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-box {
            background: #fef3cd;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .success-box {
            background: #d1fae5;
            border: 1px solid #10b981;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .app-card {
            background: white;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            padding: 20px;
            margin: 15px 0;
        }
        .app-card h3 {
            margin-top: 0;
            color: #0366d6;
        }
        .app-details {
            font-family: monospace;
            background: #f6f8fa;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .nav-tabs {
            display: flex;
            border-bottom: 1px solid #d0d7de;
            margin-bottom: 20px;
            background: white;
            border: 1px solid #d0d7de;
            border-radius: 8px;
            overflow: hidden;
        }
        .nav-tab {
            padding: 14px 24px;
            background: #f6f8fa;
            border: none;
            cursor: pointer;
            border-right: 1px solid #d0d7de;
            color: #24292f;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s ease;
            position: relative;
            flex: 1;
            text-align: center;
        }
        .nav-tab:last-child {
            border-right: none;
        }
        .nav-tab:hover {
            color: #0366d6;
            background: #dbeafe;
        }
        .nav-tab.active {
            color: white;
            background: #0366d6;
            font-weight: 700;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <h1>🚀 GitHub App Setup</h1>
    <p class="subtitle">Create GitHub Apps for your DDD website authentication</p>

    <div class="nav-tabs">
        <button class="nav-tab active" onclick="showTab('local')">Local Development</button>
        <button class="nav-tab" onclick="showTab('production')">Production</button>
        <button class="nav-tab" onclick="showTab('created')">Created Apps</button>
    </div>

    <div id="local" class="tab-content active">
        <div class="container">
            <h2>Create Local Development GitHub App</h2>
            <div class="info-box">
                <p><strong>Local Development Setup:</strong> This will create a GitHub App configured for local development at http://localhost:3800</p>
                <p><strong>Content Loading:</strong> The app will automatically configure GITHUB_ORGANIZATION to point to your username, allowing you to optionally load content from your fork instead of local files.</p>
            </div>

            <form action="https://github.com/settings/apps/new" method="POST">
                <input type="hidden" name="environment" value="local">

                <div class="form-group">
                    <label for="local-app-name">App Name:</label>
                    <input type="text" id="local-app-name" name="appName" value="DDD Admin App (Local)" required>
                </div>

                <div class="form-group">
                    <label for="local-description">Description:</label>
                    <textarea id="local-description" name="description">GitHub App for DDD website admin authentication (Local Development)</textarea>
                </div>

                <div class="form-group">
                    <label for="local-homepage">Homepage URL:</label>
                    <input type="url" id="local-homepage" name="homepageUrl" value="http://localhost:3800" required>
                </div>

                <button type="submit">Create Local GitHub App</button>
            </form>
        </div>
    </div>

    <div id="production" class="tab-content">
        <div class="container">
            <h2>Create Production GitHub App</h2>
            <div class="warning-box">
                <p><strong>Production Setup:</strong> Make sure to use your actual production domain. You'll need to configure GitHub repository secrets afterward.</p>
            </div>

            <form action="https://github.com/settings/apps/new" method="POST">
                <input type="hidden" name="environment" value="production">

                <div class="form-group">
                    <label for="prod-app-name">App Name:</label>
                    <input type="text" id="prod-app-name" name="appName" value="DDD Admin App (Production)" required>
                </div>

                <div class="form-group">
                    <label for="prod-description">Description:</label>
                    <textarea id="prod-description" name="description">GitHub App for DDD website admin authentication (Production)</textarea>
                </div>

                <div class="form-group">
                    <label for="prod-homepage">Homepage URL:</label>
                    <input type="url" id="prod-homepage" name="homepageUrl" placeholder="https://dddwa.org" required>
                </div>

                <div class="form-group">
                    <label for="github-repo">GitHub Repository (for secrets):</label>
                    <input type="text" id="github-repo" name="githubRepo" placeholder="owner/repo" pattern="[^/]+/[^/]+" title="Format: owner/repo">
                    <small>Leave empty to skip setting GitHub secrets</small>
                </div>

                <button type="submit">Create Production GitHub App</button>
            </form>
        </div>
    </div>

    <div id="created" class="tab-content">
        <div class="container">
            <h2>Created GitHub Apps</h2>
            <p>Apps created during this session will appear here after creation.</p>
            <div id="created-apps"></div>
        </div>
    </div>

    <script>
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        // Check for created apps on page load
        window.addEventListener('load', async () => {
            try {
                const response = await fetch('/created-apps');
                const apps = await response.json();
                displayCreatedApps(apps);
            } catch (error) {
                console.error('Failed to load created apps:', error);
            }
        });

        function displayCreatedApps(apps) {
            const container = document.getElementById('created-apps');
            if (apps.length === 0) {
                container.innerHTML = '<p>No apps created yet.</p>';
                return;
            }

            container.innerHTML = apps.map(app =>
                '<div class="app-card">' +
                    '<h3>' + app.name + '</h3>' +
                    '<div class="app-details">' +
                        '<strong>App ID:</strong> ' + app.id + '<br>' +
                        '<strong>Client ID:</strong> ' + app.client_id + '<br>' +
                        '<strong>Environment:</strong> ' + app.environment + '<br>' +
                        '<strong>Homepage:</strong> <a href="' + app.homepage_url + '" target="_blank">' + app.homepage_url + '</a><br>' +
                        '<strong>Setup URL:</strong> <a href="' + app.setup_url + '" target="_blank">Configure permissions</a>' +
                    '</div>' +
                    (app.environment === 'local' ?
                        '<div class="success-box">✅ Local .env file has been updated with app credentials</div>' :
                        '<div class="info-box">ℹ️ Configure GitHub repository secrets for production deployment</div>'
                    ) +
                '</div>'
            ).join('');
        }

        // Handle form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating...';
            submitBtn.disabled = true;

            // Create GitHub App manifest
            const manifest = {
                name: data.appName,
                url: data.homepageUrl,
                redirect_url: window.location.origin + '/callback',
                callback_urls: [data.homepageUrl + '/auth/github/callback'],
                public: false,
                default_permissions: {
                    metadata: 'read',
                    contents: 'read',
                },
                default_events: [],
                description: data.description,
                request_oauth_on_install: true,
            };

            // Generate state for security
            const state = Math.random().toString(36).substring(2, 15) +
                         Math.random().toString(36).substring(2, 15);

            // Store config in sessionStorage for callback
            sessionStorage.setItem('github-app-config', JSON.stringify({
                environment: data.environment,
                homepageUrl: data.homepageUrl,
                githubRepo: data.githubRepo,
                state: state
            }));

            // Add manifest and state to form
            const manifestInput = document.createElement('input');
            manifestInput.type = 'hidden';
            manifestInput.name = 'manifest';
            manifestInput.value = JSON.stringify(manifest);
            form.appendChild(manifestInput);

            const stateInput = document.createElement('input');
            stateInput.type = 'hidden';
            stateInput.name = 'state';
            stateInput.value = state;
            form.appendChild(stateInput);

            // Continue with form submission to GitHub
        });
    </script>
</body>
</html>
`

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
      } else if (pathname === '/created-apps' && method === 'get') {
        sendJSON(res, Array.from(appConfigs.values()))
      } else if (pathname === '/setup-env' && method === 'post') {
        const body = await parseBody(req)
        const { app, config } = body

        try {
          if (config.environment === 'local') {
            // For local development, fetch app owner info to set GITHUB_ORGANIZATION
            const userInfo = await fetchAppOwnerInfo(app)
            updateLocalEnv(app, config.homepageUrl, userInfo)
          } else {
            await setGitHubSecrets(app, config.homepageUrl, config.githubRepo)
          }

          // Store app details for display
          const appDetails = {
            ...app,
            environment: config.environment,
            homepage_url: config.homepageUrl,
            setup_url: `https://github.com/apps/${app.slug}`,
          }
          appConfigs.set(config.state, appDetails)

          sendJSON(res, { success: true })
        } catch (error) {
          print.warning(`Setup completed with warnings: ${error.message}`)
          sendJSON(res, { success: false, message: error.message })
        }
      } else if (pathname === '/callback' && method === 'get') {
        const { code, state } = query

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

          // Send success page with app data and let JavaScript handle environment setup
          sendHTML(
            res,
            `
            <!DOCTYPE html>
            <html>
            <head>
                <title>GitHub App Created Successfully</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        line-height: 1.6;
                        color: #333;
                    }
                    .success-box {
                        background: #d1fae5;
                        border: 1px solid #10b981;
                        border-radius: 6px;
                        padding: 20px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .app-details {
                        background: white;
                        border: 1px solid #d0d7de;
                        border-radius: 6px;
                        padding: 20px;
                        margin: 20px 0;
                    }
                    .info-box {
                        background: #dbeafe;
                        border: 1px solid #3b82f6;
                        border-radius: 6px;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .next-steps {
                        background: white;
                        border: 1px solid #d0d7de;
                        border-radius: 6px;
                        padding: 20px;
                        margin: 20px 0;
                    }
                    .button {
                        display: inline-block;
                        background: #0366d6;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        text-decoration: none;
                        margin: 5px;
                    }
                    .spinner {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #0366d6;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 2s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="success-box">
                    <h1>🎉 GitHub App Created Successfully!</h1>
                    <p>Your GitHub App "${app.name}" has been created.</p>
                    <div id="setup-status">
                        <div class="spinner"></div>
                        <p>Setting up your environment...</p>
                    </div>
                </div>

                <div class="app-details">
                    <h2>App Details</h2>
                    <p><strong>App ID:</strong> ${app.id}</p>
                    <p><strong>Client ID:</strong> ${app.client_id}</p>
                    <p><strong>Setup URL:</strong> <a href="https://github.com/apps/${app.slug}" target="_blank">Configure permissions</a></p>
                </div>

                <div class="next-steps">
                    <h3>Next Steps</h3>
                    <ol>
                        <li><strong>Configure App Permissions:</strong>
                            <a href="https://github.com/apps/${app.slug}" target="_blank" class="button">Open App Settings</a>
                        </li>
                        <li><strong>Configure OAuth Permissions:</strong>
                            <ul>
                                <li>Enable "Request user authorization (OAuth) during installation"</li>
                                <li>Set OAuth scope: <code>user:email</code></li>
                                <li>Repository permissions → Contents: Read</li>
                                <li>Account permissions → Metadata: Read</li>
                            </ul>
                        </li>
                        <li><strong>Update Admin Handles:</strong> Add your GitHub username to <code>website/app/lib/config.server.ts</code></li>
                        <li><strong>Start Development:</strong> Run <code>pnpm start</code> and test login at <code>/auth/login</code></li>
                    </ol>
                </div>

                <script>
                    const appData = ${JSON.stringify(app)};
                    const config = JSON.parse(sessionStorage.getItem('github-app-config') || '{}');

                    // Setup environment via API call
                    fetch('/setup-env', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ app: appData, config: config })
                    }).then(response => response.json())
                      .then(result => {
                          const statusDiv = document.getElementById('setup-status');
                          if (result.success) {
                              statusDiv.innerHTML = '<p>✅ Environment setup completed successfully!</p>';
                              if (config.environment === 'local') {
                                  statusDiv.innerHTML += '<p>Your .env file has been updated with GitHub App credentials.</p>';
                                  statusDiv.innerHTML += '<p><strong>Optional:</strong> Set USE_GITHUB_CONTENT=true in .env to load content from your fork.</p>';
                              }
                          } else {
                              statusDiv.innerHTML = '<p>⚠️ Setup completed with warnings: ' + result.message + '</p>';
                          }
                      })
                      .catch(error => {
                          const statusDiv = document.getElementById('setup-status');
                          statusDiv.innerHTML = '<p>⚠️ Manual setup required. Error: ' + error.message + '</p>';
                      });
                </script>
            </body>
            </html>
          `,
          )
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
  envContent = updateEnvVar(envContent, 'GITHUB_APP_ID', app.id.toString())
  envContent = updateEnvVar(envContent, 'GITHUB_CLIENT_ID', app.client_id)
  envContent = updateEnvVar(envContent, 'GITHUB_CLIENT_SECRET', app.client_secret)
  // Private key base64 encoded to prevent newline issues
  const privateKeyBase64 = Buffer.from(app.pem).toString('base64')
  envContent = updateEnvVar(envContent, 'GITHUB_PRIVATE_KEY', privateKeyBase64)

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
async function setGitHubSecrets(app, homepageUrl, githubRepo) {
  if (!githubRepo?.trim()) {
    print.info('Skipping GitHub secrets (no repository specified)')
    return
  }

  print.info('Setting GitHub repository secrets...')

  try {
    // Check if GitHub CLI is available
    execSync('gh --version', { stdio: 'ignore' })
    execSync('gh auth status', { stdio: 'ignore' })

    // Set the secrets
    execSync(`echo "${app.id}" | gh secret set GITHUB_APP_ID --repo "${githubRepo}"`, { stdio: 'ignore' })
    execSync(`echo "${app.client_id}" | gh secret set GITHUB_CLIENT_ID --repo "${githubRepo}"`, { stdio: 'ignore' })
    execSync(`echo "${app.client_secret}" | gh secret set GITHUB_CLIENT_SECRET --repo "${githubRepo}"`, {
      stdio: 'ignore',
    })
    // Base64 encode private key to prevent newline issues in GitHub secrets
    const privateKeyBase64 = Buffer.from(app.pem).toString('base64')
    execSync(`echo "${privateKeyBase64}" | gh secret set GITHUB_PRIVATE_KEY --repo "${githubRepo}"`, {
      stdio: 'ignore',
    })
    execSync(`echo "${homepageUrl}" | gh secret set WEB_URL --repo "${githubRepo}"`, { stdio: 'ignore' })

    // Generate and set SESSION_SECRET for production
    const prodSessionSecret = crypto.randomBytes(32).toString('hex')
    execSync(`echo "${prodSessionSecret}" | gh secret set SESSION_SECRET --repo "${githubRepo}"`, { stdio: 'ignore' })

    print.success('GitHub secrets set successfully')
    print.info('  GITHUB_APP_ID: Set')
    print.info('  GITHUB_CLIENT_ID: Set')
    print.info('  GITHUB_CLIENT_SECRET: Set')
    print.info('  GITHUB_PRIVATE_KEY: Set (base64 encoded)')
    print.info('  WEB_URL: Set')
    print.info('  SESSION_SECRET: Set (generated for production)')
  } catch (error) {
    print.error(`Failed to set GitHub secrets: ${error.message}`)
    print.warning('You may need to set these manually in your repository settings')
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
  console.log('  • Create GitHub Apps for local development')
  console.log('  • Create GitHub Apps for production')
  console.log('  • View created apps and their configuration')
  console.log()
  console.log('GitHub App Benefits:')
  console.log('  • Modern, recommended approach by GitHub')
  console.log('  • Granular, repository-level permissions')
  console.log('  • Higher rate limits (5,000 vs 1,000 requests/hour)')
  console.log('  • Works seamlessly with existing OAuth authentication code')
  console.log('  • Supports webhooks and advanced integrations')
  console.log('  • Private keys are automatically base64 encoded to prevent newline issues')
  console.log('  • Automatically configures local development to use your fork')
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
