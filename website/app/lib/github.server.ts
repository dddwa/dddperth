import { App } from '@octokit/app'
import { throttling } from '@octokit/plugin-throttling'
import { Octokit as createOctokit } from '@octokit/rest'
import nodePath from 'path'
import { 
    GITHUB_ORGANIZATION, 
    GITHUB_REF, 
    GITHUB_REPO, 
    GITHUB_TOKEN, 
    GITHUB_APP_ID,
    getGitHubPrivateKey 
} from './config.server'

const safePath = (s: string) => s.replace(/\\/g, '/')

const Octokit = createOctokit.plugin(throttling)
type GitHubFile = { path: string; content: string }
type GitHubClient = InstanceType<typeof Octokit>

// Create GitHub client with App or PAT authentication
async function createGitHubClient(): Promise<GitHubClient> {
    const privateKey = getGitHubPrivateKey()
    
    // Prefer GitHub App authentication if available
    if (GITHUB_APP_ID && privateKey) {
        try {
            console.log('Using GitHub App authentication')
            const app = new App({
                appId: GITHUB_APP_ID,
                privateKey,
            })
            
            // Get the installation for the organization
            const installations = await app.octokit.request('GET /app/installations')
            const installation = installations.data.find(
                (inst: any) => inst.account?.login === GITHUB_ORGANIZATION
            )
            
            if (!installation) {
                console.warn(
                    `GitHub App is not installed for organization "${GITHUB_ORGANIZATION}". ` +
                    `Falling back to PAT authentication if available.`
                )
                if (!GITHUB_TOKEN) {
                    throw new Error(
                        `GitHub App is not installed for organization "${GITHUB_ORGANIZATION}". ` +
                        `Please install the app or set GITHUB_TOKEN as fallback.`
                    )
                }
            } else {
                // Get installation access token
                const installationOctokit = await app.getInstallationOctokit(installation.id)
                console.log('GitHub App authentication successful')
                return installationOctokit as GitHubClient
            }
        } catch (error) {
            console.warn(`GitHub App authentication failed: ${error.message}`)
            console.warn('Falling back to PAT authentication if available')
            
            if (!GITHUB_TOKEN) {
                throw new Error(
                    `GitHub App authentication failed and no GITHUB_TOKEN fallback available. ` +
                    `Error: ${error.message}`
                )
            }
        }
    }
    
    // Fallback to PAT authentication
    if (GITHUB_TOKEN) {
        console.log('Using Personal Access Token authentication')
        return new Octokit({
            auth: GITHUB_TOKEN,
            throttle: {
                onRateLimit: (retryAfter, options) => {
                    const method = 'method' in options ? options.method : 'METHOD_UNKNOWN'
                    const url = 'url' in options ? options.url : 'URL_UNKNOWN'
                    console.warn(`Request quota exhausted for request ${method} ${url}. Retrying after ${retryAfter} seconds.`)
                    return true
                },
                onSecondaryRateLimit: (retryAfter, options) => {
                    const method = 'method' in options ? options.method : 'METHOD_UNKNOWN'
                    const url = 'url' in options ? options.url : 'URL_UNKNOWN'
                    console.warn(`Abuse detected for request ${method} ${url}`)
                },
            },
        })
    }
    
    throw new Error(
        'No GitHub authentication configured. Please set either:\n' +
        '- GITHUB_APP_ID and GITHUB_PRIVATE_KEY for GitHub App authentication, or\n' +
        '- GITHUB_TOKEN for Personal Access Token authentication'
    )
}

// Cache the client promise to avoid recreating it
let octokitPromise: Promise<GitHubClient> | null = null

async function getOctokit(): Promise<GitHubClient> {
    if (!octokitPromise) {
        octokitPromise = createGitHubClient().catch((error) => {
            // Clear the cached promise on error so it can be retried
            octokitPromise = null
            throw error
        })
    }
    return octokitPromise
}

async function downloadFirstMdxFile(list: Array<{ name: string; type: string; path: string; sha: string }>) {
    const filesOnly = list.filter(({ type }) => type === 'file')
    for (const extension of ['.mdx', '.md']) {
        const file = filesOnly.find(({ name }) => name.endsWith(extension))
        if (file) return downloadFileBySha(file.sha)
    }
    return null
}

/**
 *
 * @param relativeMdxFileOrDirectory the path to the content. For example:
 * content/workshops/react-fundamentals.mdx (pass "workshops/react-fudnamentals")
 * content/workshops/react-hooks/index.mdx (pass "workshops/react-hooks")
 * @returns A promise that resolves to an Array of GitHubFiles for the necessary files
 */
async function downloadMdxFileOrDirectory(
    relativeMdxFileOrDirectory: string,
): Promise<{ entry: string; files: Array<GitHubFile> }> {
    const mdxFileOrDirectory = `${relativeMdxFileOrDirectory}`

    const parentDir = nodePath.dirname(mdxFileOrDirectory)
    const dirList = await downloadDirList(parentDir)

    const basename = nodePath.basename(mdxFileOrDirectory)
    const mdxFileWithoutExt = nodePath.parse(mdxFileOrDirectory).name
    const potentials = dirList.filter(({ name }) => name.startsWith(basename))
    const exactMatch = potentials.find(({ name }) => nodePath.parse(name).name === mdxFileWithoutExt)
    const dirPotential = potentials.find(({ type }) => type === 'dir')

    const content = await downloadFirstMdxFile(exactMatch ? [exactMatch] : potentials)
    let files: Array<GitHubFile> = []
    let entry = mdxFileOrDirectory
    if (content) {
        // technically you can get the blog post by adding .mdx at the end... Weird
        // but may as well handle it since that's easy...
        entry = mdxFileOrDirectory.endsWith('.mdx') ? mdxFileOrDirectory : `${mdxFileOrDirectory}.mdx`
        // /content/about.mdx => entry is about.mdx, but compileMdx needs
        // the entry to be called "/content/index.mdx" so we'll set it to that
        // because this is the entry for this path
        files = [
            {
                path: safePath(nodePath.join(mdxFileOrDirectory, 'index.mdx')),
                content,
            },
        ]
    } else if (dirPotential) {
        entry = dirPotential.path
        files = await downloadDirectory(mdxFileOrDirectory)
    }

    return { entry, files }
}

/**
 *
 * @param dir the directory to download.
 * This will recursively download all content at the given path.
 * @returns An array of file paths with their content
 */
async function downloadDirectory(dir: string): Promise<Array<GitHubFile>> {
    const dirList = await downloadDirList(dir)

    const result = await Promise.all(
        dirList.map(async ({ path: fileDir, type, sha }) => {
            switch (type) {
                case 'file': {
                    const content = await downloadFileBySha(sha)
                    return { path: safePath(fileDir), content }
                }
                case 'dir': {
                    return downloadDirectory(fileDir)
                }
                default: {
                    throw new Error(`Unexpected repo file type: ${type}`)
                }
            }
        }),
    )

    return result.flat()
}

/**
 *
 * @param sha the hash for the file (retrieved via `downloadDirList`)
 * @returns a promise that resolves to a string of the contents of the file
 */
async function downloadFileBySha(sha: string) {
    const octokit = await getOctokit()
    const { data } = await octokit.rest.git.getBlob({
        owner: GITHUB_ORGANIZATION,
        repo: GITHUB_REPO,
        file_sha: sha,
    })
    //                                lol
    const encoding = data.encoding as Parameters<typeof Buffer.from>['1']
    return Buffer.from(data.content, encoding).toString()
}

// IDEA: possibly change this to a regular fetch since all my content is public anyway:
// https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}
// nice thing is it's not rate limited
async function downloadFile(path: string) {
    const octokit = await getOctokit()
    const { data } = await octokit.rest.repos.getContent({
        owner: GITHUB_ORGANIZATION,
        repo: GITHUB_REPO,
        path,
        ref: GITHUB_REF,
    })

    if ('content' in data && 'encoding' in data) {
        const encoding = data.encoding as Parameters<typeof Buffer.from>['1']
        return Buffer.from(data.content, encoding).toString()
    }

    console.error(data)
    throw new Error(
        `Tried to get ${path} but got back something that was unexpected. It doesn't have a content or encoding property`,
    )
}

/**
 *
 * @param path the full path to list
 * @returns a promise that resolves to a file ListItem of the files/directories in the given directory (not recursive)
 */
async function downloadDirList(path: string) {
    const octokit = await getOctokit()
    const resp = await octokit.rest.repos.getContent({
        owner: GITHUB_ORGANIZATION,
        repo: GITHUB_REPO,
        path,
        ref: GITHUB_REF,
    })
    const data = resp.data

    if (!Array.isArray(data)) {
        throw new Error(
            `Tried to download content from ${path}. GitHub did not return an array of files. This should never happen...`,
        )
    }

    return data
}

export { downloadDirList, downloadFile, downloadMdxFileOrDirectory }
