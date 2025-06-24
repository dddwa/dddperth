function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach((tab) => {
        tab.classList.remove('active')
    })
    document.querySelectorAll('.nav-tab').forEach((tab) => {
        tab.classList.remove('active')
    })

    // Show selected tab
    document.getElementById(tabName).classList.add('active')

    // Find and activate the corresponding nav button
    const navButtons = document.querySelectorAll('.nav-tab')
    navButtons.forEach((button) => {
        if (
            button.textContent.toLowerCase().includes(tabName) ||
            (tabName === 'created' && button.textContent.includes('Created')) ||
            (tabName === 'local' && button.textContent.includes('Local')) ||
            (tabName === 'production' && button.textContent.includes('Production'))
        ) {
            button.classList.add('active')
        }
    })
}

// Check for created apps on page load and populate user-specific app names
window.addEventListener('load', async () => {
    try {
        // Check URL parameters for tab selection
        const urlParams = new URLSearchParams(window.location.search)
        const tab = urlParams.get('tab')
        if (tab) {
            showTab(tab)
        }

        // Show loading state for created apps
        const container = document.getElementById('created-apps')
        container.innerHTML =
            '<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p>Loading apps...</p></div>'

        const response = await fetch('/created-apps')
        const apps = await response.json()
        displayCreatedApps(apps)

        // Try to get GitHub username for app naming
        populateUserSpecificAppNames()
    } catch (error) {
        console.error('Failed to load created apps:', error)
        const container = document.getElementById('created-apps')
        container.innerHTML = '<div class="warning-box">Failed to load apps: ' + error.message + '</div>'
    }
})

async function populateUserSpecificAppNames() {
    const localInput = document.getElementById('local-app-name')
    const prodInput = document.getElementById('prod-app-name')
    const localSpinner = document.getElementById('local-app-spinner')
    const prodSpinner = document.getElementById('prod-app-spinner')

    try {
        // Try to get GitHub username from GitHub CLI via backend
        const response = await fetch('/github-username')
        if (response.ok) {
            const data = await response.json()
            const username = data.username
            if (username) {
                localInput.value = 'DDD Admin App (Local) - ' + username
                prodInput.value = 'DDD Admin App (Production) - ' + username
                localInput.classList.remove('loading-placeholder')
                prodInput.classList.remove('loading-placeholder')
            } else {
                // No username found
                localInput.placeholder = 'DDD Admin App (Local) - Your Name'
                prodInput.placeholder = 'DDD Admin App (Production) - Your Name'
                localInput.classList.remove('loading-placeholder')
                prodInput.classList.remove('loading-placeholder')
            }
        }
    } catch (error) {
        // Fallback to prompting user to customize
        localInput.placeholder = 'DDD Admin App (Local) - Your Name'
        prodInput.placeholder = 'DDD Admin App (Production) - Your Name'
        localInput.classList.remove('loading-placeholder')
        prodInput.classList.remove('loading-placeholder')
    }

    // Hide spinners
    localSpinner.style.display = 'none'
    prodSpinner.style.display = 'none'
}

function displayCreatedApps(apps) {
    const container = document.getElementById('created-apps')
    if (apps.length === 0) {
        container.innerHTML =
            '<div class="info-box"><p>No GitHub Apps found.</p><p>Create an app using the tabs above to get started.</p></div>'
        return
    }

    console.log(apps)
    container.innerHTML = apps
        .map(
            (app) =>
                '<div class="app-card">' +
                '<h3>' +
                app.name +
                ' <span style="font-size: 0.8em; color: #666;">(' +
                app.environment +
                ')</span></h3>' +
                '<div class="app-details">' +
                '<strong>App ID:</strong> ' +
                app.id +
                '<br>' +
                '<strong>Client ID:</strong> ' +
                app.client_id +
                '<br>' +
                '<strong>Source:</strong> ' +
                app.source +
                '<br>' +
                (app.organization ? '<strong>Organization:</strong> ' + app.organization + '<br>' : '') +
                (app.repository ? '<strong>Repository:</strong> ' + app.repository + '<br>' : '') +
                '<strong>Homepage:</strong> <a href="' +
                app.homepage_url +
                '" target="_blank">' +
                app.homepage_url +
                '</a><br>' +
                (app.setup_url
                    ? '<strong>App Settings:</strong> <a href="' +
                      app.setup_url +
                      '" target="_blank">View/Configure</a><br>'
                    : '<strong>App Settings:</strong> <a href="https://github.com/settings/apps" target="_blank">Browse Your Apps</a> (App ID: ' +
                      app.id +
                      ')<br>') +
                (app.install_url
                    ? '<strong>Install App:</strong> <a href="' +
                      app.install_url +
                      '" target="_blank" class="button">Install</a>' +
                      (app.repository
                          ? '<br><small>💡 Target repository: <code class="selectable-text">' +
                            app.repository +
                            '</code> (click to select)</small>'
                          : '<br><small>💡 Suggested repository: <code class="selectable-text">dddperth</code> (click to select)</small>') +
                      '<br>'
                    : '<strong>Install App:</strong> Find in <a href="https://github.com/settings/apps" target="_blank">Your Apps</a> → Install<br>') +
                '</div>' +
                (app.hasAllCredentials
                    ? '<div class="success-box">✅ All credentials configured</div>'
                    : '<div class="warning-box">⚠️ Missing some credentials</div>') +
                (app.environment === 'local'
                    ? '<div class="info-box">📂 Local development ready<br><small>Note: Only install this app to your fork if you want to load content from GitHub instead of local files</small></div>'
                    : app.hasSecrets
                      ? '<div class="info-box">🚀 Production deployment ready</div>'
                      : '<div class="warning-box">❌ Need to configure GitHub repository secrets/variables</div>') +
                '</div>',
        )
        .join('')

    // Add click handlers for selectable text
    setTimeout(() => {
        document.querySelectorAll('.selectable-text').forEach((element) => {
            element.addEventListener('click', function () {
                // Select all text in the element
                if (window.getSelection) {
                    const selection = window.getSelection()
                    const range = document.createRange()
                    range.selectNodeContents(this)
                    selection.removeAllRanges()
                    selection.addRange(range)
                }
            })
        })
    }, 0)
}

function refreshApps() {
    const container = document.getElementById('created-apps')
    const refreshBtn = document.querySelector('button[onclick="refreshApps()"]')

    // Show loading state
    const originalContent = container.innerHTML
    container.innerHTML =
        '<div style="text-align: center; padding: 40px;"><div class="spinner"></div><p>Loading apps...</p></div>'

    // Disable button and show loading text
    const originalBtnText = refreshBtn.textContent
    refreshBtn.textContent = 'Refreshing...'
    refreshBtn.disabled = true

    fetch('/created-apps')
        .then((response) => response.json())
        .then((apps) => {
            displayCreatedApps(apps)
            // Re-enable button
            refreshBtn.textContent = originalBtnText
            refreshBtn.disabled = false
        })
        .catch((error) => {
            console.error('Failed to refresh apps:', error)
            container.innerHTML = '<div class="warning-box">Failed to load apps: ' + error.message + '</div>'
            // Re-enable button even on error
            refreshBtn.textContent = originalBtnText
            refreshBtn.disabled = false
        })
}

// Handle form submissions
document.addEventListener('submit', (e) => {
    const form = e.target
    const formData = new FormData(form)
    const data = Object.fromEntries(formData)

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.textContent
    submitBtn.textContent = 'Creating...'
    submitBtn.disabled = true

    // Create GitHub App manifest with user-specific naming
    const manifest = {
        name: data.appName,
        url: data.homepageUrl,
        redirect_url: window.location.origin + '/callback',
        callback_urls: [
            // For app creation, use setup script callback
            window.location.origin + '/callback',
            // Also include the app's eventual callback URL for OAuth flows
            (data.homepageUrl.startsWith('http') ? data.homepageUrl : 'http://' + data.homepageUrl) +
                '/auth/github/callback',
        ],
        public: false,
        default_permissions: {
            metadata: 'read',
            contents: 'read',
            emails: 'read',
        },
        default_events: [],
        description: data.description,
        request_oauth_on_install: true,
    }

    // Generate state for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Store config in sessionStorage for callback
    sessionStorage.setItem(
        'github-app-config',
        JSON.stringify({
            environment: data.environment,
            homepageUrl: data.homepageUrl,
            githubRepo: data.githubRepo,
            state: state,
        }),
    )

    // Add manifest and state to form
    const manifestInput = document.createElement('input')
    manifestInput.type = 'hidden'
    manifestInput.name = 'manifest'
    manifestInput.value = JSON.stringify(manifest)
    form.appendChild(manifestInput)

    const stateInput = document.createElement('input')
    stateInput.type = 'hidden'
    stateInput.name = 'state'
    stateInput.value = state
    form.appendChild(stateInput)

    // Continue with form submission to GitHub
})
