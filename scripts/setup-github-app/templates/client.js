const form = document.getElementById('setup-form')
const homepageInput = document.getElementById('homepage-url')
const orgInput = document.getElementById('organization')
const stagingProdNote = document.getElementById('staging-prod-note')

function selectedEnvironment() {
    return document.querySelector('input[name="environment"]:checked').value
}

function applyDefaults() {
    const env = selectedEnvironment()

    if (env === 'local') {
        homepageInput.value = 'http://localhost:3800'
        orgInput.value = ''
        stagingProdNote.hidden = true
    } else if (env === 'staging') {
        homepageInput.value = 'https://staging.dddperth.com'
        orgInput.value = 'dddwa'
        stagingProdNote.hidden = false
    } else {
        homepageInput.value = 'https://dddperth.com'
        orgInput.value = 'dddwa'
        stagingProdNote.hidden = false
    }
}

document.querySelectorAll('input[name="environment"]').forEach((input) => {
    input.addEventListener('change', applyDefaults)
})

applyDefaults()

form.addEventListener('submit', (event) => {
    const env = selectedEnvironment()
    const homepageUrl = homepageInput.value.replace(/\/$/, '')
    const organization = orgInput.value.trim()

    const callbackUrls = [`${homepageUrl}/auth/github/callback`]

    const manifest = {
        name: document.getElementById('app-name').value,
        url: homepageUrl,
        redirect_url: `${window.location.origin}/callback`,
        callback_urls: callbackUrls,
        public: false,
        request_oauth_on_install: true,
        default_permissions: {
            metadata: 'read',
            emails: 'read',
        },
        default_events: [],
    }

    sessionStorage.setItem('ddd-app-environment', env)

    // For org-owned apps, GitHub expects the form to POST to the org's settings URL.
    if (organization) {
        form.action = `https://github.com/organizations/${organization}/settings/apps/new`
    } else {
        form.action = 'https://github.com/settings/apps/new'
    }

    const manifestInput = document.createElement('input')
    manifestInput.type = 'hidden'
    manifestInput.name = 'manifest'
    manifestInput.value = JSON.stringify(manifest)
    form.appendChild(manifestInput)

    void event
})
