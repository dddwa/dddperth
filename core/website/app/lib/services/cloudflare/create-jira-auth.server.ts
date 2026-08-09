export function createJiraAuth(envToken: string | undefined, envEmail: string | undefined) {
    const token = envToken ? envToken : ''
    const email = envEmail ? envEmail : ''
    return { authToken: token, authEmail: email }
}
