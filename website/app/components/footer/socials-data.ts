// Footer social links. The list of *which* networks render is core's
// decision (icons live here); the *URLs* come from the conference manifest
// so a fork has nothing to fork here — they fill in
// conference/config/socials.ts and the right rows light up.

import { conferenceManifest } from '@conference/manifest'
import type { ComponentType, SVGProps } from 'react'
import EmailIcon from '~/images/social/email-icon.svg?react'
import FacebookIcon from '~/images/social/facebook-icon.svg?react'
import FlickrIcon from '~/images/social/flickr-icon.svg?react'
import GithubIcon from '~/images/social/github-icon.svg?react'
import InstagramIcon from '~/images/social/instagram-icon.svg?react'
import LinkedInIcon from '~/images/social/linkedin-icon.svg?react'
import MediumIcon from '~/images/social/medium-icon.svg?react'
import TwitterIcon from '~/images/social/twitter-icon.svg?react'
import YouTubeIcon from '~/images/social/youtube-icon.svg?react'

export interface SocialLink {
    title: string
    icon: ComponentType<SVGProps<SVGSVGElement>>
    link: string
}

const { socials, brand } = conferenceManifest

// Build the list eagerly. Each row is included only if the manifest has a
// value for it — a fork without a Twitter account doesn't get a dead icon.
const rows: Array<SocialLink | null> = [
    socials.Twitter
        ? { title: 'Twitter', icon: TwitterIcon, link: `https://twitter.com/${socials.Twitter.Name}` }
        : null,
    socials.Facebook
        ? { title: 'Facebook', icon: FacebookIcon, link: `https://facebook.com/${socials.Facebook}` }
        : null,
    socials.Instagram
        ? { title: 'Instagram', icon: InstagramIcon, link: `https://www.instagram.com/${socials.Instagram}` }
        : null,
    socials.Linkedin
        ? { title: 'LinkedIn', icon: LinkedInIcon, link: `https://www.linkedin.com/company/${socials.Linkedin}` }
        : null,
    socials.Flickr ? { title: 'Flickr', icon: FlickrIcon, link: socials.Flickr } : null,
    socials.Blog ? { title: 'Medium', icon: MediumIcon, link: socials.Blog } : null,
    socials.Youtube ? { title: 'YouTube', icon: YouTubeIcon, link: socials.Youtube } : null,
    socials.GitHub ? { title: 'GitHub', icon: GithubIcon, link: `https://github.com/${socials.GitHub}` } : null,
    { title: 'Email', icon: EmailIcon, link: `mailto:${socials.Email ?? brand.contactEmail}` },
]

export const socialsData: SocialLink[] = rows.filter((row): row is SocialLink => row !== null)
