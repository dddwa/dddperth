import yaml from 'yaml'
// The fork's `content.blogAuthorsFile` from its build manifest, served by the
// mdx-bundles Vite plugin alongside the posts that reference it.
import authorsYamlFileContents from 'virtual:blog-authors'

export interface BlogAuthor {
    name: string
    title: string
    avatar: string
}

const AUTHORS: BlogAuthor[] = yaml.parse(authorsYamlFileContents)
const AUTHOR_NAMES = AUTHORS.map((a) => a.name)

export function getAuthor(name: string): BlogAuthor | undefined {
    return AUTHORS.find((a) => a.name === name)
}

export function getValidAuthorNames(authorNames: string[]) {
    return authorNames.filter((authorName) => AUTHOR_NAMES.includes(authorName))
}
