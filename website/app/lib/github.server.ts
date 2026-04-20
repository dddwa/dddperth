import { App } from '@octokit/app'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { Octokit } from '@octokit/rest'
import nodePath from 'path'
import type { CloudflareEnv } from '../remix-app-load-context'
import { getGitHubConfig, isGitHubAppConfigured } from './config.server'
import { recordException } from './record-exception'

const safePath = (s: string) => s.replace(/\\/g, '/')

type GitHubFile = { path: string; content: string }

const MyOctokit = Octokit.plugin(restEndpointMethods)

// Cache for GitHub clients per installation
const clientCache = new Map<string, ReturnType<typeof createGitHubClient>>()

async function createGitHubClient(env: CloudflareEnv) {
    if (!isGitHubAppConfigured(env)) {
        throw new Error(
            'GitHub App credentials are not configured. Set WEBSITE_GITHUB_APP_ID, WEBSITE_GITHUB_APP_PRIVATE_KEY, and WEBSITE_GITHUB_APP_INSTALLATION_ID to enable GitHub-backed content.',
        )
    }

    const config = getGitHubConfig(env)

    try {
        console.log('Using GitHub App authentication')
        const app = new App({
            appId: config.appId,
            privateKey: config.privateKey,
            Octokit: MyOctokit,
        })

        console.log(`Using stored installation ID: ${config.installationId}`)
        const installationId = Number.parseInt(config.installationId, 10)
        if (Number.isNaN(installationId)) {
            throw new Error('WEBSITE_GITHUB_APP_INSTALLATION_ID must be a valid integer.')
        }

        const installationOctokit = await app.getInstallationOctokit(installationId)
        return installationOctokit
    } catch (error) {
        recordException(error)
        throw error
    }
}

async function getOctokit(env: CloudflareEnv) {
    const config = getGitHubConfig(env)
    const cacheKey = config.installationId

    if (!clientCache.has(cacheKey)) {
        const clientPromise = createGitHubClient(env).catch((error) => {
            clientCache.delete(cacheKey)
            throw error
        })
        clientCache.set(cacheKey, clientPromise)
    }

    const client = await clientCache.get(cacheKey)!

    if (!client) {
        throw new Error('GitHub client is null or undefined')
    }

    return client
}

async function downloadFirstMdxFile(
    env: CloudflareEnv,
    list: Array<{ name: string; type: string; path: string; sha: string }>,
) {
    const filesOnly = list.filter(({ type }) => type === 'file')
    for (const extension of ['.mdx', '.md']) {
        const file = filesOnly.find(({ name }) => name.endsWith(extension))
        if (file) return downloadFileBySha(env, file.sha)
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
    env: CloudflareEnv,
    relativeMdxFileOrDirectory: string,
): Promise<{ entry: string; files: Array<GitHubFile> }> {
    try {
        const mdxFileOrDirectory = `${relativeMdxFileOrDirectory}`

        const parentDir = nodePath.dirname(mdxFileOrDirectory)
        const dirList = await downloadDirList(env, parentDir)

        const basename = nodePath.basename(mdxFileOrDirectory)
        const mdxFileWithoutExt = nodePath.parse(mdxFileOrDirectory).name
        const potentials = dirList.filter(({ name }) => name.startsWith(basename))
        const exactMatch = potentials.find(({ name }) => nodePath.parse(name).name === mdxFileWithoutExt)
        const dirPotential = potentials.find(({ type }) => type === 'dir')

        const content = await downloadFirstMdxFile(env, exactMatch ? [exactMatch] : potentials)
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
            files = await downloadDirectory(env, mdxFileOrDirectory)
        }

        return { entry, files }
    } catch (error) {
        recordException(error)
        throw error
    }
}

/**
 *
 * @param dir the directory to download.
 * This will recursively download all content at the given path.
 * @returns An array of file paths with their content
 */
async function downloadDirectory(env: CloudflareEnv, dir: string): Promise<Array<GitHubFile>> {
    const dirList = await downloadDirList(env, dir)

    const result = await Promise.all(
        dirList.map(async ({ path: fileDir, type, sha }) => {
            switch (type) {
                case 'file': {
                    const content = await downloadFileBySha(env, sha)
                    return { path: safePath(fileDir), content }
                }
                case 'dir': {
                    return downloadDirectory(env, fileDir)
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
async function downloadFileBySha(env: CloudflareEnv, sha: string) {
    const config = getGitHubConfig(env)
    const octokit = await getOctokit(env)
    const { data } = await octokit.rest.git.getBlob({
        owner: config.organization,
        repo: config.repo,
        file_sha: sha,
    })

    const encoding = data.encoding as BufferEncoding
    return Buffer.from(data.content, encoding).toString()
}

// IDEA: possibly change this to a regular fetch since all my content is public anyway:
// https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}
// nice thing is it's not rate limited
async function downloadFile(env: CloudflareEnv, path: string) {
    const config = getGitHubConfig(env)
    const octokit = await getOctokit(env)
    const { data } = await octokit.rest.repos.getContent({
        owner: config.organization,
        repo: config.repo,
        path,
        ref: config.ref,
    })

    if ('content' in data && 'encoding' in data) {
        const encoding = data.encoding as BufferEncoding
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
async function downloadDirList(env: CloudflareEnv, path: string) {
    const config = getGitHubConfig(env)
    const octokit = await getOctokit(env)
    const resp = await octokit.rest.repos.getContent({
        owner: config.organization,
        repo: config.repo,
        path,
        ref: config.ref,
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
