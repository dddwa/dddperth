import yaml from 'yaml'
// Authors file lives in the fork's /conference/content/blog/. Resolved via
// the @conference path alias so a fork doesn't need to edit core source.
import authorsYamlFileContents from '@conference/content/blog/authors.yml?raw'

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
