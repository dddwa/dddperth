/**
 * Subset of the GitHub App manifest conversion response we care about.
 * Full schema: https://docs.github.com/en/rest/apps/apps#create-a-github-app-from-a-manifest
 */
export interface GitHubAppFromManifest {
    id: number
    slug: string
    name: string
    client_id: string
    client_secret: string
    pem: string
    owner?: { login?: string; name?: string | null }
}

/**
 * Exchange the temporary code returned from the GitHub App manifest flow
 * for the app's OAuth credentials.
 */
export async function exchangeManifestCode(code: string): Promise<GitHubAppFromManifest> {
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

    return (await response.json()) as GitHubAppFromManifest
}
