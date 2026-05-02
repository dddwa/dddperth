/**
 * Exchange the temporary code returned from the GitHub App manifest flow
 * for the app's OAuth credentials.
 *
 * Docs: https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest
 */
export async function exchangeManifestCode(code) {
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

    return response.json()
}
