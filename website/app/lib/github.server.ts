import { App } from '@octokit/app'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { Octokit } from '@octokit/rest'
import nodePath from 'path'
import {
    getGitHubPrivateKey,
    GITHUB_ORGANIZATION,
    GITHUB_REF,
    GITHUB_REPO,
    WEBSITE_GITHUB_APP_ID,
    WEBSITE_GITHUB_APP_INSTALLATION_ID,
} from './config.server'

const safePath = (s: string) => s.replace(/\\/g, '/')

type GitHubFile = { path: string; content: string }

import { trace } from '@opentelemetry/api'
import { recordException } from './record-exception'

const tracer = trace.getTracer('github.server')

const MyOctokit = Octokit.plugin(restEndpointMethods)

async function createGitHubClient() {
    return await tracer.startActiveSpan('createGitHubClient', async (span) => {
        try {
            console.log('Using GitHub App authentication')
            const privateKey = getGitHubPrivateKey()
            const app = new App({
                appId: WEBSITE_GITHUB_APP_ID,
                privateKey,
                Octokit: MyOctokit,
            })

            console.log(`Using stored installation ID: ${WEBSITE_GITHUB_APP_INSTALLATION_ID}`)
            const installationId = parseInt(WEBSITE_GITHUB_APP_INSTALLATION_ID)

            const installationOctokit = await app.getInstallationOctokit(installationId)
            return installationOctokit
        } catch (error) {
            recordException(error, { span })
            throw error
        } finally {
            span.end()
        }
    })
}

// Cache the client promise to avoid recreating it
let octokitPromise: ReturnType<typeof createGitHubClient> | null = null

async function getOctokit() {
    if (!octokitPromise) {
        octokitPromise = createGitHubClient().catch((error) => {
            // Clear the cached promise on error so it can be retried
            octokitPromise = null
            throw error
        })
    }
    const client = await octokitPromise

    // Debug: Check if client has expected properties
    if (!client) {
        throw new Error('GitHub client is null or undefined')
    }

    return client
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
    return await tracer.startActiveSpan('downloadMdxFileOrDirectory', async (span) => {
        span.setAttribute('relativeMdxFileOrDirectory', relativeMdxFileOrDirectory)
        try {
            const mdxFileOrDirectory = `${relativeMdxFileOrDirectory}`

            const parentDir = nodePath.dirname(mdxFileOrDirectory)
            span.setAttribute('parentDir', parentDir)
            const dirList = await downloadDirList(parentDir)

            const basename = nodePath.basename(mdxFileOrDirectory)
            const mdxFileWithoutExt = nodePath.parse(mdxFileOrDirectory).name
            span.setAttribute('basename', basename)
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

            span.setAttribute('entry', entry)
            return { entry, files }
        } catch (error) {
            recordException(error, { span })
            throw error
        } finally {
            span.end()
        }
    })
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
