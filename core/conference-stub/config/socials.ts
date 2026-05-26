import type { Socials } from '@ddd/conference-config'

// DevConf Example isn't real, so these accounts don't exist. They're here
// so the footer/meta tags render a representative set of links — forks can
// see the full Socials shape without scrolling through types.
export const socials: Socials = {
    Twitter: { Id: '0', Name: 'devconfexample' },
    Linkedin: 'devconf-example',
    GitHub: 'devconf-example',
    Email: 'info@example.test',
}
