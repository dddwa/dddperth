#!/usr/bin/env node

import chalk from 'chalk'
import { program } from 'commander'
import fs from 'fs/promises'
import inquirer from 'inquirer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..')
const SPONSORS_DIR = path.join(ROOT_DIR, 'website', 'public', 'images', 'sponsors')
const YEARS_CONFIG_DIR = path.join(ROOT_DIR, 'website', 'app', 'config', 'years')

const SPONSOR_TIERS = [
    'platinum',
    'gold',
    'silver',
    'digital',
    'bronze',
    'community',
    'coffeeCart',
    'quietRoom',
    'keynotes',
    'room',
]

// Helper function to read year config
async function readYearConfig(year) {
    const configPath = path.join(YEARS_CONFIG_DIR, `${year}.server.ts`)
    try {
        const content = await fs.readFile(configPath, 'utf-8')
        return content
    } catch (error) {
        console.error(chalk.red(`Failed to read config for year ${year}:`, error.message))
        return null
    }
}

// Helper function to find sponsor in previous years
async function findSponsorInPreviousYears(sponsorName, currentYear) {
    const years = []
    const files = await fs.readdir(YEARS_CONFIG_DIR)

    for (const file of files) {
        const match = file.match(/^(\d{4})\.server\.ts$/)
        if (match && match[1] < currentYear) {
            years.push(match[1])
        }
    }

    years.sort().reverse() // Most recent first

    for (const year of years) {
        const config = await readYearConfig(year)
        if (config && config.includes(sponsorName)) {
            // Extract sponsor data using regex
            const sponsorRegex = new RegExp(`{[^}]*name:\\s*['"]${sponsorName}['"][^}]*}`, 'gs')
            const match = config.match(sponsorRegex)
            if (match) {
                return { year, data: match[0] }
            }
        }
    }

    return null
}

// Helper to check if logo files exist
async function checkLogoFiles(year, sponsorName) {
    const variants = ['light', 'dark']
    const extensions = ['svg', 'png']
    const existing = []

    for (const variant of variants) {
        for (const ext of extensions) {
            const filename = `${year}-${sponsorName.toLowerCase().replace(/\s+/g, '-')}-${variant}.${ext}`
            const filepath = path.join(SPONSORS_DIR, filename)
            try {
                await fs.access(filepath)
                existing.push({ variant, extension: ext, filename })
            } catch {
                // File doesn't exist
            }
        }
    }

    return existing
}

// Add sponsor command
async function addSponsor(options) {
    const { year, name, tier } = options

    console.log(chalk.blue(`\nAdding sponsor "${name}" to ${year} as ${tier} sponsor\n`))

    // Check if sponsor exists in previous years
    const previousSponsor = await findSponsorInPreviousYears(name, year)

    if (previousSponsor) {
        console.log(chalk.yellow(`Found "${name}" in ${previousSponsor.year} configuration`))

        const { confirmSame } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmSame',
                message: "Has the sponsor's logo changed since then?",
                default: false,
            },
        ])

        if (!confirmSame) {
            // Copy logos from previous year
            const oldLogos = await checkLogoFiles(previousSponsor.year, name)
            console.log(chalk.green(`Found ${oldLogos.length} logo files from ${previousSponsor.year}`))

            for (const logo of oldLogos) {
                const oldPath = path.join(SPONSORS_DIR, logo.filename)
                const newFilename = logo.filename.replace(previousSponsor.year, year)
                const newPath = path.join(SPONSORS_DIR, newFilename)

                await fs.copyFile(oldPath, newPath)
                console.log(chalk.gray(`  Copied: ${newFilename}`))
            }
        }
    }

    // Check for existing logos
    const existingLogos = await checkLogoFiles(year, name)

    if (existingLogos.length === 0) {
        console.log(chalk.yellow('\nNo logo files found. Please upload logos using the web UI.'))
    } else {
        console.log(chalk.green(`\nFound ${existingLogos.length} logo variant(s):`))
        existingLogos.forEach((logo) => {
            console.log(chalk.gray(`  - ${logo.filename}`))
        })
    }

    // Generate sponsor object
    const sponsorNameSlug = name.toLowerCase().replace(/\s+/g, '-')
    const sponsorObj = `{
    name: '${name}',
    website: '', // TODO: Add website URL
    logoUrlDarkMode: '/images/sponsors/${year}-${sponsorNameSlug}-dark.svg',
    logoUrlLightMode: '/images/sponsors/${year}-${sponsorNameSlug}-light.svg',
    quote: '', // TODO: Add sponsor quote if provided
}`

    console.log(chalk.blue('\nSponsor configuration to add:'))
    console.log(chalk.gray(sponsorObj))

    console.log(chalk.yellow(`\nPlease manually add this to: website/app/config/years/${year}.server.ts`))
    console.log(chalk.yellow(`Under the "${tier}" array in the sponsors section\n`))

    // Ask if user wants to launch web UI
    const { launchUI } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'launchUI',
            message: 'Would you like to launch the web UI to upload/process logos?',
            default: true,
        },
    ])

    if (launchUI) {
        console.log(chalk.blue('\nLaunching web UI...'))
        const webUIScript = path.join(__dirname, 'add-sponsor.mjs')
        await import(webUIScript)
    }
}

// Import sponsor from previous year
async function importSponsor(options) {
    const { from, to, sponsor } = options

    console.log(chalk.blue(`\nImporting "${sponsor}" from ${from} to ${to}\n`))

    const previousConfig = await readYearConfig(from)
    if (!previousConfig) {
        console.error(chalk.red(`Could not read ${from} configuration`))
        return
    }

    // Find sponsor in source year
    const sponsorRegex = new RegExp(`{[^}]*name:\\s*['"]${sponsor}['"][^}]*}`, 'gs')
    const match = previousConfig.match(sponsorRegex)

    if (!match) {
        console.error(chalk.red(`Sponsor "${sponsor}" not found in ${from}`))
        return
    }

    console.log(chalk.green(`Found sponsor configuration in ${from}`))

    // Check if logo has changed
    const { logoChanged } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'logoChanged',
            message: "Has the sponsor's logo changed?",
            default: false,
        },
    ])

    const sponsorNameSlug = sponsor.toLowerCase().replace(/\s+/g, '-')

    if (!logoChanged) {
        // Copy logo files
        const oldLogos = await checkLogoFiles(from, sponsor)

        for (const logo of oldLogos) {
            const oldPath = path.join(SPONSORS_DIR, logo.filename)
            const newFilename = logo.filename.replace(from, to)
            const newPath = path.join(SPONSORS_DIR, newFilename)

            await fs.copyFile(oldPath, newPath)
            console.log(chalk.gray(`  Copied: ${newFilename}`))
        }
    } else {
        console.log(chalk.yellow('\nPlease upload new logos using the web UI'))
    }

    // Update the configuration
    const updatedConfig = match[0].replace(new RegExp(`${from}-${sponsorNameSlug}`, 'g'), `${to}-${sponsorNameSlug}`)

    console.log(chalk.blue('\nUpdated sponsor configuration:'))
    console.log(chalk.gray(updatedConfig))

    // Ask for tier
    const { tier } = await inquirer.prompt([
        {
            type: 'list',
            name: 'tier',
            message: 'Select sponsor tier for this year:',
            choices: SPONSOR_TIERS,
        },
    ])

    console.log(chalk.yellow(`\nPlease add this to: website/app/config/years/${to}.server.ts`))
    console.log(chalk.yellow(`Under the "${tier}" array in the sponsors section\n`))
}

// Process logos command
async function processLogos(options) {
    const { year } = options

    console.log(chalk.blue(`\nProcessing logos for ${year}\n`))
    console.log(chalk.yellow('This will launch the web UI for logo processing'))

    const webUIScript = path.join(__dirname, 'add-sponsor.mjs')
    await import(webUIScript)
}

// Launch Web UI
async function launchUI() {
    console.log(chalk.blue('\nLaunching Sponsor Management Web UI...\n'))
    const webUIScript = path.join(__dirname, 'add-sponsor.mjs')
    await import(webUIScript)
}

// Main CLI setup
program.name('sponsor-manager').description('DDD Perth Sponsor Management Tool').version('1.0.0')

program
    .command('add')
    .description('Add a new sponsor')
    .requiredOption('-y, --year <year>', 'Conference year')
    .requiredOption('-n, --name <name>', 'Sponsor name')
    .requiredOption('-t, --tier <tier>', 'Sponsor tier', 'gold')
    .action(addSponsor)

program
    .command('import')
    .description('Import sponsor from previous year')
    .requiredOption('-f, --from <year>', 'Source year')
    .requiredOption('-t, --to <year>', 'Target year')
    .requiredOption('-s, --sponsor <name>', 'Sponsor name')
    .action(importSponsor)

program
    .command('process-logos')
    .description('Process logos for a year')
    .requiredOption('-y, --year <year>', 'Conference year')
    .action(processLogos)

program.command('ui').description('Launch the web UI for sponsor management').action(launchUI)

program
    .command('list')
    .description('List sponsors for a year')
    .requiredOption('-y, --year <year>', 'Conference year')
    .action(async (options) => {
        const config = await readYearConfig(options.year)
        if (config) {
            console.log(chalk.blue(`\nSponsors for ${options.year}:\n`))

            for (const tier of SPONSOR_TIERS) {
                const tierRegex = new RegExp(`${tier}:\\s*\\[([^\\]]*)]`, 'gs')
                const match = config.match(tierRegex)
                if (match && match[0].includes('name:')) {
                    console.log(chalk.yellow(`${tier.toUpperCase()}:`))
                    const sponsors = match[0].match(/name:\s*'([^']+)'/g)
                    if (sponsors) {
                        sponsors.forEach((s) => {
                            const name = s.match(/name:\s*'([^']+)'/)[1]
                            console.log(chalk.gray(`  - ${name}`))
                        })
                    }
                }
            }
        }
    })

// Parse arguments
program.parse(process.argv)

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp()
}
