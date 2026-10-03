import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'

export const conference2022: ConferenceYear = {
    kind: 'conference',
    year: '2022',
    conferenceDate: DateTime.fromISO('2022-09-10'),
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2022',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/2uxzbaxa',
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: undefined,
    },
    recordings: {
        '337380': 'Uvlqg6Xnuhw', // This Talk Won't Change You, But How You Remember It Will
        '344274': 'Pacp8NUFst8', // Let's grow some feature trees 🌳
        '343408': 'S-fRhCTiJys', // Web 3 The Great Con
        '344367': 'zwoZYuJ3PoQ', // The Art of Creative Coding
        '344044': 'Zt0cFkoHhak', // The most important thing you need to know about Microservices
        '344101': 'OREBcN_p5uQ', // Escaping the Vortex: Or How I Learned to Stop Procrastinating and Get Things Done (Mostly)
        '343942': 'FjC1pDGsbu0', // The Mistake Everyone Makes in Google Interviews
        '342543': '1kXGLJDhI-0', // Refactoring Components
        '334148': '7xTrVqtU0to', // This Talk Has Been Disabled
        '344023': 'DZEN_SxwkUw', // Doodling and Drawing - Expressing ideas and concepts through visual communication
        '333791': 'yi7zvseS74s', // Five design patterns to build more resilient applications
        '344494': 'rvsNGUEe4n4', // Choose your own pen-test adventure!
        '338797': 'Fg65FcphRx8', // Training a PowerPoint AI to Play Tic Tac Toe
        '344002': '5p9DrzDNxHI', // Why is my query slow? An indexing story
        '344418': 'vKclA4HQ9-E', // Everyone’s confused about design, and that’s ok.
        '343628': 'Rb6EFtGXpbs', // Release your inner DevOps
        '338125': '_a6fdheHpcY', // Inclusive storytelling with dynamic data
        '343620': 'lwPqhSy7IzM', // Paying it forward
        '339320': 'HLHgHXqnhms', // How fast is your website really? Shining a light on web performance with real user monitoring
        '333736': 'LKoeAflDXaE', // How to Manage Your Ducks
        '343984': 'YjFzm3V6nSg', // Web APIs for delightful two factor auth experiences
        '340959': 'otFzdQnpFnA', // How your simple application could lead to your customers losing their life savings!
        '344464': 'uW2jSO4SlRs', // Deep Fake's within Social Media: An Exploration of Fun and Profit in FinTech
        '343953': '2oakOtVlFcM', // From imposter life to imposter moments: Tips from a Psychologist turned Engineer
        '341816': 'xko9n1Hy1Rk', // They're people, not users
        '344501': 'P-ml4cv7qvE', // Distributed databases - Why, What, and How?
        '344419': 'fBRIgyhPRq0', // Lessons from the Video Game Industry
        '342452': 'jEYj2APkqic', // Project Insanity
        '337322': 'vRt1wGPN7HQ', // Offline-first, not offline mode
        '344493': 'BCX0AA1CFqM', // How to be productive when working remote
        '343385': 'xkOWVOLX-Es', // Serverless Testing - Local Considered Harmful?
        '343105': 'tBtFwMdBBiM', // End to End DevOps with GitHub
        '336320': 'YZgJjuDa778', // Leadership Through Self-Awareness
        '343968': 'LXjqIIesDCY', // The limits of my [programming] language mean the limits of my world
        '339597': '0gZO79pGBow', // Unleash the Power of VS Code
        '344431': 'pvJZ8LPP7Tk', // I AM A COMPUTER and so are you...
        '341472': '1WEKv7W4K8k', // Super Hero Layouts
        '379497': 'fcxE-q_Y_Xw', // Panel: AMA (Ask Me Anything)
        '379496': 'z3xRA6cPdVE', // Panel: Inclusive Teams and Flexible Working
        '343399': '3Loxg52MWRE', // What video games have taught me about designing for motivation
        '343561': 'cz5pLXPKeUY', // A Sh!tshow: The regrettably relatable retrospective.
        '340848': 'b2AuaG_cYZA', // Data Lakes! and other bodies of water that killed 'Big Data'
        '343948': 'xJmgQkuAAEs', // GitHub Copilot, using AI to help you learn, code, and build
        '339017': 'KSxoHpQ1SlI', // Architecture for all
        '343697': 'W1QCCddffw0', // The War for Tech Talent
        '343793': 'dz5Ifj-z8Aw', // Banning “Best Practice”
        '344427': '4XC9qeLDLqc', // Failure 101:  What life lessons can teach us about better software development
        '344491': 'mzYKUKIQF54', // Is there a naked Emperor in your development team?
        '383016': 'BiP_ybxkY7A', // The Cat In The Box
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    ticketInfo: undefined,

    sponsors: {
        platinum: [
            {
                name: 'Telstra Purple',
                logoUrlDarkMode: '/images/sponsors/2022-telstra-purple-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-telstra-purple-light.png',
                website: 'https://purple.telstra.com',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2022-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-microsoft-light.png',
                website: 'https://docs.microsoft.com/en-au/learn/',
                quote: undefined,
            },
            {
                name: 'Mantel Group',
                logoUrlDarkMode: '/images/sponsors/2022-mantel-group-dark.svg',
                logoUrlLightMode: '/images/sponsors/2022-mantel-group-light.svg',
                website: 'https://mantelgroup.com.au/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'MakerX',
                logoUrlDarkMode: '/images/sponsors/2022-makerx-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-makerx-light.png',
                website: 'https://makerx.com.au',
                quote: undefined,
            },
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2022-insight-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-insight-light.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2022-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Versent',
                logoUrlDarkMode: '/images/sponsors/2022-versent-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-versent-light.png',
                website: 'https://versent.com.au',
                quote: undefined,
            },
            {
                name: 'Twilio',
                logoUrlDarkMode: '/images/sponsors/2022-twilio-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-twilio-light.png',
                website: 'https://www.twilio.com',
                quote: undefined,
            },
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2022-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2022-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Valrose',
                logoUrlDarkMode: '/images/sponsors/2022-valrose-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-valrose-light.png',
                website: 'https://valrose.com.au/',
                quote: undefined,
            },
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2022-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-bankwest-light.png',
                website: 'https://bankwest.com.au',
                quote: undefined,
            },
            {
                name: 'GitHub',
                logoUrlDarkMode: '/images/sponsors/2022-github-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-github-light.png',
                website: 'https://github.com',
                quote: undefined,
            },
            {
                name: 'Auth0',
                logoUrlDarkMode: '/images/sponsors/2022-auth0-dark.png',
                logoUrlLightMode: '/images/sponsors/2022-auth0-light.png',
                website: 'https://auth0.com',
                quote: undefined,
            },
        ],
    },
}
