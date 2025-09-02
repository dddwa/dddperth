#!/usr/bin/env node

import fs from 'fs/promises'
import http from 'http'
import path from 'path'
import sharp from 'sharp'
import { Project } from 'ts-morph'
import url, { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..')
const SPONSORS_DIR = path.join(ROOT_DIR, 'website', 'public', 'images', 'sponsors')
const YEARS_CONFIG_DIR = path.join(ROOT_DIR, 'website', 'app', 'config', 'years')

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
}

const print = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
}

const config = {
    port: 3802,
    appName: 'DDD Perth Sponsor Management',
}

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
        return null
    }
}

// Improved sponsor parsing using ts-morph for reliable TypeScript parsing
async function getSponsorsByYear(year) {
    const configPath = path.join(YEARS_CONFIG_DIR, `${year}.server.ts`)

    try {
        // Try ts-morph approach first (more reliable)
        const project = new Project()
        const sourceFile = project.addSourceFileAtPath(configPath)

        // Find the conference object
        const conferenceVar = sourceFile.getVariableDeclaration(`conference${year}`)
        if (!conferenceVar) {
            print.warning(`No conference${year} variable found, falling back to regex`)
            return await extractSponsorsRegex(year)
        }

        const initializer = conferenceVar.getInitializer()
        if (!initializer || !initializer.getKind()) {
            return await extractSponsorsRegex(year)
        }

        // Get the sponsors property
        const sponsorsProperty = initializer.getProperty('sponsors')
        if (!sponsorsProperty) {
            return await extractSponsorsRegex(year)
        }

        const sponsors = {}

        // Initialize all tiers
        for (const tier of SPONSOR_TIERS) {
            sponsors[tier] = []
        }

        // Parse each tier
        const sponsorsInit = sponsorsProperty.getInitializer()
        if (sponsorsInit) {
            for (const tier of SPONSOR_TIERS) {
                const tierProperty = sponsorsInit.getProperty(tier)
                if (tierProperty) {
                    const tierArray = tierProperty.getInitializer()
                    if (tierArray && tierArray.getElements) {
                        const elements = tierArray.getElements()

                        sponsors[tier] = elements.map((element) => {
                            const sponsor = {}

                            // Extract properties using correct ts-morph API
                            const nameProperty = element.getProperty('name')
                            if (nameProperty) {
                                const nameInit = nameProperty.getInitializer()
                                if (nameInit && nameInit.getText) {
                                    // Remove quotes from the string value
                                    sponsor.name = nameInit.getText().replace(/['"]/g, '')
                                }
                            }

                            const websiteProperty = element.getProperty('website')
                            if (websiteProperty) {
                                const websiteInit = websiteProperty.getInitializer()
                                if (websiteInit && websiteInit.getText) {
                                    sponsor.website = websiteInit.getText().replace(/['"]/g, '')
                                }
                            }

                            const logoDarkProperty = element.getProperty('logoUrlDarkMode')
                            if (logoDarkProperty) {
                                const logoDarkInit = logoDarkProperty.getInitializer()
                                if (logoDarkInit && logoDarkInit.getText) {
                                    sponsor.logoUrlDarkMode = logoDarkInit.getText().replace(/['"]/g, '')
                                }
                            }

                            const logoLightProperty = element.getProperty('logoUrlLightMode')
                            if (logoLightProperty) {
                                const logoLightInit = logoLightProperty.getInitializer()
                                if (logoLightInit && logoLightInit.getText) {
                                    sponsor.logoUrlLightMode = logoLightInit.getText().replace(/['"]/g, '')
                                }
                            }

                            const quoteProperty = element.getProperty('quote')
                            if (quoteProperty) {
                                const quoteInit = quoteProperty.getInitializer()
                                if (quoteInit && quoteInit.getText) {
                                    const quoteText = quoteInit.getText().replace(/['"]/g, '')
                                    sponsor.quote = quoteText && quoteText !== 'undefined' ? quoteText : ''
                                }
                            }

                            return sponsor
                        })
                    }
                }
            }
        }

        return sponsors
    } catch (error) {
        print.error(`ts-morph parsing failed: ${error.message}`)
        print.info('Falling back to regex parsing')
        return await extractSponsorsRegex(year)
    }
}

// Fallback regex-based sponsor extraction (simplified)
async function extractSponsorsRegex(year) {
    const configContent = await readYearConfig(year)
    if (!configContent) return null

    const sponsors = {}

    // Initialize all tiers
    for (const tier of SPONSOR_TIERS) {
        sponsors[tier] = []
    }

    // Simple approach - look for sponsors section and try to extract basic info
    const sponsorsMatch = configContent.match(/sponsors:\s*{([\s\S]*?)},?\s*\w+:/)
    if (!sponsorsMatch) return sponsors

    const sponsorsSection = sponsorsMatch[1]

    // For each tier, try to extract sponsors
    for (const tier of SPONSOR_TIERS) {
        const tierPattern = new RegExp(`${tier}:\\s*\\[([\s\S]*?)\\]`, 'g')
        const tierMatch = tierPattern.exec(sponsorsSection)

        if (tierMatch) {
            // Look for name patterns
            const nameMatches = tierMatch[1].match(/name:\s*['"`]([^'"`]+)['"`]/g)
            if (nameMatches) {
                sponsors[tier] = nameMatches.map((nameStr) => {
                    const name = nameStr.match(/name:\s*['"`]([^'"`]+)['"`]/)[1]
                    return {
                        name: name,
                        website: '',
                        logoUrlDarkMode: '',
                        logoUrlLightMode: '',
                        quote: '',
                    }
                })
            }
        }
    }

    return sponsors
}

// Logo processing functions
async function processLogo(buffer, filename) {
    const results = {}

    try {
        if (filename.endsWith('.svg')) {
            // SVG processing - two-step approach as requested
            const svgContent = buffer.toString('utf-8')
            results.original = 'data:image/svg+xml;base64,' + buffer.toString('base64')

            // Step 1: Create white/light version - make all non-white areas black
            const whiteVersion = svgContent
                // Handle CSS styles in <style> tags - convert fill colors to black
                .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
                    const newStyleContent = styleContent
                        // Convert fill colors in CSS to black (except white/transparent)
                        .replace(/fill:\s*#([a-f0-9]{3,6})/gi, (fillMatch, color) => {
                            const c = color.toLowerCase()
                            if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                                return fillMatch // Keep whites/very light colors
                            }
                            return 'fill: #000000'
                        })
                        .replace(/fill:\s*rgb\(([^)]+)\)/gi, (fillMatch, rgb) => {
                            const values = rgb.split(',').map((v) => parseInt(v.trim()))
                            if (values.every((v) => v >= 240)) {
                                return fillMatch
                            }
                            return 'fill: rgb(0,0,0)'
                        })
                        .replace(/fill:\s*(?!white|transparent|none)([a-z]+)/gi, 'fill: #000000')
                        // Also handle stroke colors
                        .replace(/stroke:\s*#([a-f0-9]{3,6})/gi, (strokeMatch, color) => {
                            const c = color.toLowerCase()
                            if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                                return strokeMatch
                            }
                            return 'stroke: #000000'
                        })
                        .replace(/stroke:\s*rgb\(([^)]+)\)/gi, (strokeMatch, rgb) => {
                            const values = rgb.split(',').map((v) => parseInt(v.trim()))
                            if (values.every((v) => v >= 240)) {
                                return strokeMatch
                            }
                            return 'stroke: rgb(0,0,0)'
                        })
                        .replace(/stroke:\s*(?!white|transparent|none)([a-z]+)/gi, 'stroke: #000000')

                    return `<style${match.slice(6, match.indexOf('>'))}>${newStyleContent}</style>`
                })
                // Convert any inline hex colors to black (except white variations)
                .replace(/fill="#([a-f0-9]{3,6})"/gi, (match, color) => {
                    const c = color.toLowerCase()
                    if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                        return match
                    }
                    return 'fill="#000000"'
                })
                .replace(/stroke="#([a-f0-9]{3,6})"/gi, (match, color) => {
                    const c = color.toLowerCase()
                    if (c === 'fff' || c === 'ffffff' || c.match(/^[e-f]{3,6}$/)) {
                        return match
                    }
                    return 'stroke="#000000"'
                })
                // Convert inline RGB colors to black (except white)
                .replace(/fill="rgb\(([^)]+)\)"/gi, (match, rgb) => {
                    const values = rgb.split(',').map((v) => parseInt(v.trim()))
                    if (values.every((v) => v >= 240)) {
                        return match
                    }
                    return 'fill="rgb(0,0,0)"'
                })
                .replace(/stroke="rgb\(([^)]+)\)"/gi, (match, rgb) => {
                    const values = rgb.split(',').map((v) => parseInt(v.trim()))
                    if (values.every((v) => v >= 240)) {
                        return match
                    }
                    return 'stroke="rgb(0,0,0)"'
                })
                // Handle inline named colors
                .replace(/fill="(?!none|transparent|white)([a-z]+)"/gi, 'fill="#000000"')
                .replace(/stroke="(?!none|transparent|white)([a-z]+)"/gi, 'stroke="#000000"')

            results.light = 'data:image/svg+xml;base64,' + Buffer.from(whiteVersion).toString('base64')

            // Step 2: Create dark version by inverting the white version
            const darkVersion = whiteVersion
                // Handle CSS styles in <style> tags - invert black to white
                .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
                    const newStyleContent = styleContent
                        // Invert black colors in CSS to white
                        .replace(/fill:\s*#000000/gi, 'fill: #FFFFFF')
                        .replace(/fill:\s*#000/gi, 'fill: #FFF')
                        .replace(/fill:\s*black/gi, 'fill: white')
                        .replace(/fill:\s*rgb\(0,\s*0,\s*0\)/gi, 'fill: rgb(255,255,255)')
                        // Also handle stroke colors
                        .replace(/stroke:\s*#000000/gi, 'stroke: #FFFFFF')
                        .replace(/stroke:\s*#000/gi, 'stroke: #FFF')
                        .replace(/stroke:\s*black/gi, 'stroke: white')
                        .replace(/stroke:\s*rgb\(0,\s*0,\s*0\)/gi, 'stroke: rgb(255,255,255)')

                    return `<style${match.slice(6, match.indexOf('>'))}>${newStyleContent}</style>`
                })
                // Invert inline black colors to white
                .replace(/fill="#000000"/gi, 'fill="#FFFFFF"')
                .replace(/fill="#000"/gi, 'fill="#FFF"')
                .replace(/fill="black"/gi, 'fill="white"')
                .replace(/stroke="#000000"/gi, 'stroke="#FFFFFF"')
                .replace(/stroke="#000"/gi, 'stroke="#FFF"')
                .replace(/stroke="black"/gi, 'stroke="white"')
                // Handle RGB black values
                .replace(/fill="rgb\(0,\s*0,\s*0\)"/gi, 'fill="rgb(255,255,255)"')
                .replace(/stroke="rgb\(0,\s*0,\s*0\)"/gi, 'stroke="rgb(255,255,255)"')

            results.dark = 'data:image/svg+xml;base64,' + Buffer.from(darkVersion).toString('base64')
        } else {
            // PNG/JPG processing with Sharp - two-step approach to match SVG logic
            results.original = 'data:image/png;base64,' + buffer.toString('base64')

            // Step 1: Create white/light version - convert non-white areas to black
            // First trim whitespace, then process
            const trimmedBuffer = await sharp(buffer)
                .trim() // Remove whitespace/transparent edges
                .ensureAlpha() // Ensure we have an alpha channel
                .raw()
                .toBuffer({ resolveWithObject: true })

            const { data, info } = trimmedBuffer
            const { width, height, channels } = info

            // Process pixel by pixel to convert colored areas to black, keep transparency
            for (let i = 0; i < data.length; i += channels) {
                const r = data[i]
                const g = data[i + 1]
                const b = data[i + 2]
                const a = data[i + 3]

                // If pixel is not transparent and not very light, make it black
                if (a > 50) {
                    // Not transparent
                    const brightness = (r + g + b) / 3
                    if (brightness < 240) {
                        // Not very light/white
                        data[i] = 0 // R = black
                        data[i + 1] = 0 // G = black
                        data[i + 2] = 0 // B = black
                        // Keep original alpha
                    }
                }
            }

            const whiteVersionBuffer = await sharp(data, {
                raw: { width, height, channels },
            })
                .png()
                .toBuffer()

            results.light = 'data:image/png;base64,' + whiteVersionBuffer.toString('base64')

            // Step 2: Create dark version by inverting the light version (black → white)
            const darkVersionBuffer = await sharp(whiteVersionBuffer)
                .negate({ alpha: false }) // Don't negate alpha channel
                .toBuffer()

            results.dark = 'data:image/png;base64,' + darkVersionBuffer.toString('base64')
        }

        results.success = true
        return results
    } catch (error) {
        return {
            success: false,
            error: error.message,
            original: 'data:image/png;base64,' + buffer.toString('base64'),
        }
    }
}

// Simple multipart parser for file uploads
function parseMultipart(data, boundary) {
    const parts = {}
    const files = {}
    const sections = data.split(`--${boundary}`)

    for (const section of sections) {
        if (section.includes('Content-Disposition')) {
            // Split headers from content
            const headerEndIndex = section.indexOf('\r\n\r\n')
            if (headerEndIndex === -1) continue

            const headers = section.slice(0, headerEndIndex)
            const content = section.slice(headerEndIndex + 4)

            // Parse Content-Disposition header
            const headerMatch = headers.match(
                /Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/,
            )
            if (headerMatch) {
                const fieldName = headerMatch[1]
                const filename = headerMatch[2]

                // Clean content (remove trailing boundary markers and line endings)
                let cleanContent = content.replace(/\r\n$/, '').replace(/\r\n--$/, '')

                if (filename) {
                    files[fieldName] = {
                        filename,
                        data: Buffer.from(cleanContent, 'binary'),
                    }
                } else {
                    parts[fieldName] = cleanContent
                }
            }
        }
    }

    return { parts, files }
}

// Function to automatically add sponsor to TypeScript config file
async function addSponsorToConfig(year, tier, sponsorObj) {
    try {
        const { Project } = await import('ts-morph')
        const project = new Project()

        const configPath = path.join(YEARS_CONFIG_DIR, `${year}.server.ts`)

        // Check if config file exists, if not create a basic one
        try {
            await fs.access(configPath)
        } catch {
            throw new Error('Config file does not exist: ' + configPath)
        }

        const sourceFile = project.addSourceFileAtPath(configPath)

        // Find the conference object
        const conferenceVar = sourceFile.getVariableDeclaration(`conference${year}`)
        if (!conferenceVar) {
            print.error(`Could not find conference${year} variable in config`)
            return false
        }

        const initializer = conferenceVar.getInitializer()
        if (!initializer || !initializer.getKind) {
            print.error('Could not find conference initializer')
            return false
        }

        // Find the sponsors property
        let sponsorsProperty = null
        if (initializer.getKindName() === 'ObjectLiteralExpression') {
            sponsorsProperty = initializer.getProperty('sponsors')
        }

        if (!sponsorsProperty) {
            print.error('Could not find sponsors property in config')
            return false
        }

        // Get the sponsors object
        const sponsorsInitializer = sponsorsProperty
            .getChildren()
            .find((child) => child.getKindName() === 'ObjectLiteralExpression')

        if (!sponsorsInitializer) {
            print.error('Could not find sponsors object initializer')
            return false
        }

        // Find the tier array
        let tierProperty = sponsorsInitializer.getProperty(tier)
        if (!tierProperty) {
            print.error(`Could not find ${tier} tier in sponsors config`)
            return false
        }

        // Get the array initializer
        const tierInitializer = tierProperty
            .getChildren()
            .find((child) => child.getKindName() === 'ArrayLiteralExpression')

        if (!tierInitializer) {
            print.error(`Could not find ${tier} array initializer`)
            return false
        }

        // Create the sponsor object string with proper escaping
        const escapedName = sponsorObj.name.replace(/'/g, "\\'")
        const escapedWebsite = sponsorObj.website.replace(/'/g, "\\'")
        const escapedQuote = sponsorObj.quote
            ? sponsorObj.quote.replace(/'/g, "\\'").replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t')
            : ''

        const sponsorString = `{
                name: '${escapedName}',
                website: '${escapedWebsite}',
                logoUrlDarkMode: '${sponsorObj.logoUrlDarkMode}',
                logoUrlLightMode: '${sponsorObj.logoUrlLightMode}',${escapedQuote ? `\n                quote: '${escapedQuote}',` : ''}
            }`

        // Add the sponsor to the array using text insertion instead of AST manipulation
        const currentText = tierInitializer.getText()
        const newText = currentText.replace(/\[\s*/, `[\n            ${sponsorString},`)
        tierInitializer.replaceWithText(newText)

        // Save the file
        await sourceFile.save()

        print.info(`Successfully added ${sponsorObj.name} to ${tier} sponsors in ${year}`)
        return true
    } catch (error) {
        print.error(`Error adding sponsor to config: ${error.message}`)
        return false
    }
}

// Function to update sponsor logo URLs in TypeScript config file
async function updateSponsorLogoInConfig(year, sponsorName, logoUrlDarkMode, logoUrlLightMode) {
    try {
        const { Project } = await import('ts-morph')
        const project = new Project()

        const configPath = path.join(YEARS_CONFIG_DIR, `${year}.server.ts`)

        // Check if config file exists
        try {
            await fs.access(configPath)
        } catch {
            throw new Error('Config file does not exist: ' + configPath)
        }

        const sourceFile = project.addSourceFileAtPath(configPath)

        // Find the conference object
        const conferenceVar = sourceFile.getVariableDeclaration(`conference${year}`)
        if (!conferenceVar) {
            print.error(`Could not find conference${year} variable in config`)
            return false
        }

        const initializer = conferenceVar.getInitializer()
        if (!initializer || !initializer.getKind) {
            print.error('Could not find conference initializer')
            return false
        }

        // Find the sponsors property
        let sponsorsProperty = null
        if (initializer.getKindName() === 'ObjectLiteralExpression') {
            sponsorsProperty = initializer.getProperty('sponsors')
        }

        if (!sponsorsProperty) {
            print.error('Could not find sponsors property in config')
            return false
        }

        // Get the sponsors object
        const sponsorsInitializer = sponsorsProperty
            .getChildren()
            .find((child) => child.getKindName() === 'ObjectLiteralExpression')

        if (!sponsorsInitializer) {
            print.error('Could not find sponsors object initializer')
            return false
        }

        // Search through all tier arrays to find the sponsor
        const tiers = [
            'platinum',
            'gold',
            'silver',
            'standard',
            'bronze',
            'community',
            'coffee',
            'keynote',
            'afterparty',
            'service',
        ]
        let sponsorFound = false
        let sponsorTier = null

        for (const tier of tiers) {
            const tierProperty = sponsorsInitializer.getProperty(tier)
            if (!tierProperty) continue

            const tierInitializer = tierProperty
                .getChildren()
                .find((child) => child.getKindName() === 'ArrayLiteralExpression')

            if (!tierInitializer) continue

            // Get the current text and check if sponsor exists in this tier
            const tierText = tierInitializer.getText()
            const escapedName = sponsorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const sponsorRegex = new RegExp(`{[^}]*name:\\s*['"\`]${escapedName}['"\`][^}]*}`, 's')

            if (sponsorRegex.test(tierText)) {
                sponsorFound = true
                sponsorTier = tier

                // Update the sponsor's logo URLs
                const updatedText = tierText.replace(sponsorRegex, (match) => {
                    // Update logoUrlDarkMode
                    let updated = match.replace(
                        /logoUrlDarkMode:\s*['"`][^'"`]*['"`]/,
                        `logoUrlDarkMode: '${logoUrlDarkMode}'`,
                    )
                    // Update logoUrlLightMode
                    updated = updated.replace(
                        /logoUrlLightMode:\s*['"`][^'"`]*['"`]/,
                        `logoUrlLightMode: '${logoUrlLightMode}'`,
                    )
                    return updated
                })

                tierInitializer.replaceWithText(updatedText)
                break
            }
        }

        if (!sponsorFound) {
            print.error(`Could not find sponsor "${sponsorName}" in any tier for year ${year}`)
            return false
        }

        // Save the file
        await sourceFile.save()

        print.info(`Successfully updated logo URLs for ${sponsorName} in ${sponsorTier} sponsors (${year})`)
        return true
    } catch (error) {
        print.error(`Error updating sponsor logo in config: ${error.message}`)
        return false
    }
}

// HTML template for the UI
function getHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.appName}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .form-section { background: #f9f9f9; padding: 20px; border-radius: 6px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; color: #555; }
        input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        textarea { height: 80px; resize: vertical; }
        .upload-area { border: 2px dashed #ddd; border-radius: 6px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; }
        .upload-area:hover { border-color: #007cba; background: #f0f8ff; }
        .upload-area.dragover { border-color: #007cba; background: #e6f3ff; }
        .preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px; }
        .preview-item { text-align: center; background: #f9f9f9; padding: 15px; border-radius: 6px; }
        .preview-item img { max-width: 100%; max-height: 120px; object-fit: contain; border: 1px solid #eee; border-radius: 4px; }
        .preview-item h4 { margin: 10px 0 5px; color: #333; }
        .btn { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; transition: background 0.3s; }
        .btn:hover { background: #005a87; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        .error { background: #ffe6e6; color: #cc0000; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .success { background: #e6ffe6; color: #006600; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .loading { text-align: center; padding: 20px; color: #666; }
        .year-selector { position: sticky; top: 20px; background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .sponsor-list { margin-top: 30px; }
        .tier-section { margin-bottom: 30px; }
        .tier-title { background: #333; color: white; padding: 10px 15px; margin: 0; border-radius: 4px 4px 0 0; }
        .sponsor-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; background: #f9f9f9; padding: 20px; border-radius: 0 0 4px 4px; }
        .sponsor-card { background: white; padding: 15px; border-radius: 4px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .sponsor-logo { max-width: 100%; max-height: 60px; object-fit: contain; }
        .update-logo-btn {
            margin-top: 10px; padding: 6px 12px; background: #007cba; color: white; border: none;
            border-radius: 4px; cursor: pointer; font-size: 12px;
        }
        .update-logo-btn:hover { background: #005a87; }
        .tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
        .tab.active { border-bottom-color: #007cba; color: #007cba; font-weight: 500; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .search-results { position: relative; }
        .search-result { border: 1px solid #ddd; border-top: none; padding: 10px; cursor: pointer; background: white; display: flex; align-items: center; gap: 10px; }
        .search-result:hover { background: #f5f5f5; }
        .search-result:first-child { border-top: 1px solid #ddd; border-radius: 0 0 4px 4px; }
        .search-result .sponsor-logo-preview { width: 40px; height: 30px; object-fit: contain; border: 1px solid #eee; }
        .search-result .sponsor-info { flex: 1; }
        .search-result .sponsor-name { font-weight: 500; color: #333; }
        .search-result .sponsor-details { font-size: 12px; color: #666; margin-top: 2px; }
        .logo-preview-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: none; align-items: center; justify-content: center; }
        .logo-preview-content { background: white; padding: 30px; border-radius: 8px; max-width: 90%; max-height: 90%; overflow-y: auto; }
        .logo-variants-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .logo-variant { text-align: center; }
        .logo-variant img { max-width: 100%; max-height: 80px; object-fit: contain; border: 1px solid #eee; margin-bottom: 5px; }
        .modal-actions { text-align: center; margin-top: 20px; }
        .modal-actions button { margin: 0 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 ${config.appName}</h1>

        <div class="year-selector">
            <label for="year">Conference Year:</label>
            <select id="year" onchange="loadSponsors()">
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2019">2019</option>
                <option value="2018">2018</option>
            </select>
        </div>

        <div class="tabs">
            <div class="tab active" onclick="showTab('add')">Add Sponsor</div>
            <div class="tab" onclick="showTab('view')">View Sponsors</div>
        </div>

        <div id="add-tab" class="tab-content active">
            <form id="sponsor-form" enctype="multipart/form-data">
                <div class="form-grid">
                    <div class="form-section">
                        <h3>Sponsor Details</h3>
                        <div class="form-group">
                            <label for="sponsor-search">Search Existing Sponsors (Optional)</label>
                            <input type="text" id="sponsor-search" placeholder="Type sponsor name to search previous years..." onkeyup="searchSponsors()" autocomplete="off">
                            <div id="sponsor-results" class="search-results"></div>
                        </div>
                        <div class="form-group">
                            <label for="name">Company Name *</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="website">Website URL</label>
                            <input type="url" id="website" name="website" placeholder="https://example.com">
                        </div>
                        <div class="form-group">
                            <label for="tier">Sponsorship Tier *</label>
                            <select id="tier" name="tier" required>
                                <option value="platinum">Platinum</option>
                                <option value="gold" selected>Gold</option>
                                <option value="silver">Silver</option>
                                <option value="digital">Digital</option>
                                <option value="bronze">Bronze</option>
                                <option value="community">Community</option>
                                <option value="coffeeCart">Coffee Cart</option>
                                <option value="quietRoom">Quiet Room</option>
                                <option value="keynotes">Keynotes</option>
                                <option value="room">Room</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="quote">Quote (Optional)</label>
                            <textarea id="quote" name="quote" placeholder="Optional sponsor statement"></textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Logo Upload</h3>
                        <div class="upload-area" onclick="document.getElementById('logo').click()">
                            <input type="file" id="logo" name="logo" accept="image/*" style="display: none" onchange="previewLogo()">
                            <p>Click to select logo file</p>
                            <p style="font-size: 12px; color: #666; margin-top: 10px;">SVG preferred, PNG acceptable</p>
                        </div>
                    </div>
                </div>

                <div id="preview-section" style="display: none;">
                    <h3>Logo Preview - All Variants</h3>
                    <div id="preview-grid" class="preview-grid"></div>
                    <div style="margin-top: 20px;">
                        <button type="button" class="btn" onclick="processAndSave()" id="save-btn" disabled>
                            ✅ Approve & Save Sponsor
                        </button>
                    </div>
                </div>
            </form>
        </div>

        <div id="view-tab" class="tab-content">
            <div id="sponsor-list" class="sponsor-list">
                <div class="loading">Loading sponsors...</div>
            </div>
        </div>
    </div>

    <!-- Logo Preview Modal -->
    <div id="logo-preview-modal" class="logo-preview-modal">
        <div class="logo-preview-content">
            <h3 id="modal-sponsor-name">Sponsor Logo Variants</h3>
            <div id="logo-variants-grid" class="logo-variants-grid"></div>
            <div class="modal-actions">
                <button class="btn" onclick="useExistingLogos()">✅ Use Existing Logos</button>
                <button class="btn" onclick="needNewLogos()" style="background: orange;">🔄 Need New Logos</button>
                <button onclick="closeLogoModal()" style="background: #666;">❌ Cancel</button>
            </div>
        </div>
    </div>

    <script>
        let currentPreviews = null;
        let searchTimeout = null;

        function showTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            // Find and activate the clicked tab
            document.querySelectorAll('.tab').forEach(t => {
                if (t.textContent.toLowerCase().includes(tab)) {
                    t.classList.add('active');
                }
            });

            document.getElementById(tab + '-tab').classList.add('active');

            if (tab === 'view') {
                loadSponsors();
            }
        }

        async function previewLogo() {
            const fileInput = document.getElementById('logo');
            const file = fileInput.files[0];

            if (!file) return;

            const formData = new FormData();
            formData.append('logo', file);

            try {
                const response = await fetch('/api/process-logo', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    currentPreviews = result;
                    displayPreview(result);
                } else {
                    alert('Error processing logo: ' + result.error);
                }
            } catch (error) {
                alert('Error processing logo: ' + error.message);
            }
        }

        function displayPreview(previews) {
            const previewSection = document.getElementById('preview-section');
            const previewGrid = document.getElementById('preview-grid');
            const saveBtn = document.getElementById('save-btn');

            updatePreviewDisplay(previews);

            previewSection.style.display = 'block';
            saveBtn.disabled = false;
        }

        function updatePreviewDisplay(previews) {
            const previewGrid = document.getElementById('preview-grid');

            previewGrid.innerHTML =
                '<div class="preview-item">' +
                    '<img src="' + previews.original + '" alt="Original">' +
                    '<h4>Original</h4>' +
                '</div>' +
                '<div class="preview-item">' +
                    '<img src="' + previews.light + '" alt="Light Mode" style="background: #fff; padding: 10px; border: 1px solid #eee;">' +
                    '<h4>Light Mode</h4>' +
                    '<p style="font-size: 12px; color: #666; margin-top: 5px;">For light backgrounds</p>' +
                '</div>' +
                '<div class="preview-item">' +
                    '<img src="' + previews.dark + '" alt="Dark Mode" style="background: #333; padding: 10px;">' +
                    '<h4>Dark Mode</h4>' +
                    '<p style="font-size: 12px; color: #666; margin-top: 5px;">For dark backgrounds</p>' +
                '</div>';
        }

        async function processAndSave() {
            const form = document.getElementById('sponsor-form');
            const formData = new FormData(form);
            const year = document.getElementById('year').value;

            // Add processed logo data if available
            if (currentPreviews) {
                formData.append('logoData', JSON.stringify(currentPreviews));
            }

            formData.append('year', year);

            try {
                const response = await fetch('/api/sponsors', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    alert('Sponsor added successfully!\\n\\nNext steps:\\n1. Review the generated config in your terminal\\n2. Add it to the year config file\\n3. Commit the changes');
                    form.reset();
                    document.getElementById('preview-section').style.display = 'none';
                    document.getElementById('save-btn').disabled = true;
                    currentPreviews = null;

                    // Clear search results and cache
                    document.getElementById('sponsor-search').value = '';
                    document.getElementById('sponsor-results').innerHTML = '';
                    if (searchTimeout) {
                        clearTimeout(searchTimeout);
                    }

                    // Switch to view tab to see the results
                    showTab('view');
                } else {
                    alert('Error saving sponsor: ' + result.error);
                }
            } catch (error) {
                alert('Error saving sponsor: ' + error.message);
            }
        }

        async function loadSponsors() {
            const year = document.getElementById('year').value;
            const sponsorList = document.getElementById('sponsor-list');

            sponsorList.innerHTML = '<div class="loading">Loading sponsors...</div>';

            try {
                const response = await fetch('/api/sponsors/' + year);
                const sponsors = await response.json();

                let html = '';

                for (const [tier, tierSponsors] of Object.entries(sponsors)) {
                    if (tierSponsors.length > 0) {
                        html +=
                            '<div class="tier-section">' +
                                '<h3 class="tier-title">' + tier.toUpperCase() + '</h3>' +
                                '<div class="sponsor-grid">';

                        for (const sponsor of tierSponsors) {
                            const logoUrl = sponsor.logoUrlLightMode || sponsor.logoUrlDarkMode || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiPk5vIExvZ288L3RleHQ+PC9zdmc+';
                            html +=
                                '<div class="sponsor-card">' +
                                    '<img src="' + logoUrl + '" alt="' + sponsor.name + '" class="sponsor-logo" onerror="this.style.display=\\\'none\\\'">' +
                                    '<h4>' + sponsor.name + '</h4>' +
                                    (sponsor.website ? '<a href="' + sponsor.website + '" target="_blank" style="font-size: 12px;">Visit Website</a>' : '') +
                                    '<button class="update-logo-btn" onclick="updateSponsorLogo(\\\'' + sponsor.name + '\\\', \\\'' + year + '\\\')">🔄 Update Logo</button>' +
                                '</div>';
                        }

                        html += '</div></div>';
                    }
                }

                if (html === '') {
                    html = '<div style="text-align: center; padding: 40px; color: #666;">No sponsors found for ' + year + '</div>';
                }

                sponsorList.innerHTML = html;

            } catch (error) {
                sponsorList.innerHTML = '<div class="error">Error loading sponsors: ' + error.message + '</div>';
            }
        }

        // Sponsor search functionality
        function searchSponsors() {
            const query = document.getElementById('sponsor-search').value;
            const currentYear = document.getElementById('year').value;
            const resultsDiv = document.getElementById('sponsor-results');

            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (query.length < 2) {
                resultsDiv.innerHTML = '';
                return;
            }

            // Debounce search
            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch('/api/sponsors/search?q=' + encodeURIComponent(query) + '&exclude=' + currentYear);
                    const results = await response.json();

                    if (results.length === 0) {
                        resultsDiv.innerHTML = '<div style="padding: 10px; color: #666; font-style: italic;">No sponsors found</div>';
                        return;
                    }

                    let html = '';
                    for (const sponsor of results) {
                        // Clean up sponsor data and handle undefined values
                        const cleanSponsor = {
                            name: sponsor.name || '',
                            website: sponsor.website || '',
                            logoUrlLightMode: (sponsor.logoUrlLightMode && sponsor.logoUrlLightMode !== 'undefined') ? sponsor.logoUrlLightMode : '',
                            logoUrlDarkMode: (sponsor.logoUrlDarkMode && sponsor.logoUrlDarkMode !== 'undefined') ? sponsor.logoUrlDarkMode : '',
                            quote: (sponsor.quote && sponsor.quote !== 'undefined') ? sponsor.quote : '',
                            year: sponsor.year || '',
                            tier: sponsor.tier || ''
                        };

                        const logoUrl = cleanSponsor.logoUrlLightMode || cleanSponsor.logoUrlDarkMode || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+Tm8gTG9nbzwvdGV4dD48L3N2Zz4=';
                        html +=
                            '<div class="search-result" onclick="previewSponsorLogos(' + JSON.stringify(cleanSponsor).replace(/"/g, '&quot;') + ')">' +
                                '<img src="' + logoUrl + '" alt="' + cleanSponsor.name + '" class="sponsor-logo-preview">' +
                                '<div class="sponsor-info">' +
                                    '<div class="sponsor-name">' + cleanSponsor.name + '</div>' +
                                    '<div class="sponsor-details">From ' + cleanSponsor.year + ' (' + cleanSponsor.tier.toUpperCase() + ' tier)</div>' +
                                '</div>' +
                            '</div>';
                    }

                    resultsDiv.innerHTML = html;
                } catch (error) {
                    console.error('Search error:', error);
                    resultsDiv.innerHTML = '<div style="padding: 10px; color: #cc0000;">Search failed</div>';
                }
            }, 300);
        }

        let selectedSponsor = null;

        function previewSponsorLogos(sponsor) {
            selectedSponsor = sponsor;
            const modal = document.getElementById('logo-preview-modal');
            const nameElement = document.getElementById('modal-sponsor-name');
            const gridElement = document.getElementById('logo-variants-grid');

            // Safety check for required properties
            if (!sponsor || !sponsor.name || !sponsor.year) {
                console.error('Invalid sponsor data:', sponsor);
                return;
            }

            nameElement.textContent = sponsor.name + ' - Logo Variants from ' + sponsor.year;

            // Build logo variants grid
            let variantsHtml = '';

            if (sponsor.logoUrlLightMode && sponsor.logoUrlLightMode !== '' && sponsor.logoUrlLightMode !== 'undefined') {
                variantsHtml += '<div class="logo-variant"><img src="' + sponsor.logoUrlLightMode + '" alt="Light Mode"><div>Light Mode</div></div>';
            }
            if (sponsor.logoUrlDarkMode && sponsor.logoUrlDarkMode !== '' && sponsor.logoUrlDarkMode !== 'undefined') {
                variantsHtml += '<div class="logo-variant"><img src="' + sponsor.logoUrlDarkMode + '" alt="Dark Mode" style="background: #333; padding: 10px;"><div>Dark Mode</div></div>';
            }

            if (!variantsHtml) {
                variantsHtml = '<div style="text-align: center; color: #666; grid-column: 1/-1;">No logo variants available for preview</div>';
            }

            gridElement.innerHTML = variantsHtml;
            modal.style.display = 'flex';
        }

        async function useExistingLogos() {
            if (selectedSponsor) {
                const currentYear = document.getElementById('year').value;

                // Show loading state
                const modal = document.getElementById('logo-preview-modal');
                const originalContent = modal.innerHTML;
                modal.innerHTML = '<div style="text-align: center; padding: 50px; color: white;"><div>Copying logo files...</div></div>';

                try {
                    // Copy logo files to new year
                    const response = await fetch('/api/copy-logos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sponsor: selectedSponsor,
                            toYear: currentYear
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        fillSponsorForm(selectedSponsor, true, result.copiedFiles);
                        closeLogoModal();
                    } else {
                        alert('Error copying logos: ' + result.error);
                        modal.innerHTML = originalContent;
                    }
                } catch (error) {
                    alert('Error copying logos: ' + error.message);
                    modal.innerHTML = originalContent;
                }
            }
        }

        function needNewLogos() {
            if (selectedSponsor) {
                fillSponsorForm(selectedSponsor, false);
                closeLogoModal();
                // Focus on logo upload
                setTimeout(() => {
                    document.getElementById('logo').focus();
                }, 100);
            }
        }

        function closeLogoModal() {
            document.getElementById('logo-preview-modal').style.display = 'none';
            selectedSponsor = null;
        }

        function fillSponsorForm(sponsor, copyLogos, copiedFiles) {
            // Fill form with sponsor data
            document.getElementById('name').value = sponsor.name || '';
            document.getElementById('website').value = sponsor.website || '';
            document.getElementById('tier').value = sponsor.tier || 'gold';
            document.getElementById('quote').value = (sponsor.quote && sponsor.quote !== 'undefined') ? sponsor.quote : '';

            // Clear search
            document.getElementById('sponsor-search').value = '';
            document.getElementById('sponsor-results').innerHTML = '';

            // Enable save button if logos were copied successfully
            const saveBtn = document.getElementById('save-btn');
            if (copyLogos && copiedFiles && copiedFiles.length > 0) {
                saveBtn.disabled = false;
                // Show preview section
                document.getElementById('preview-section').style.display = 'block';
                // Update preview grid to show that logos are ready
                document.getElementById('preview-grid').innerHTML =
                    '<div class="preview-item" style="text-align: center; grid-column: span 5;">' +
                        '<h4>✅ Logo files copied from ' + sponsor.year + '</h4>' +
                        '<p>Ready to save sponsor with existing logos</p>' +
                    '</div>';
            } else {
                saveBtn.disabled = true;
            }

            // Show notification
            const notification = document.createElement('div');
            notification.className = 'success';
            if (copyLogos) {
                if (copiedFiles && copiedFiles.length > 0) {
                    notification.textContent = 'Success! Copied ' + copiedFiles.length + ' logo files from ' + sponsor.year + '. Click "Approve & Save" when ready.';
                } else {
                    notification.textContent = 'Sponsor details filled from ' + sponsor.year + '. Some logos could not be copied - you may need to upload new ones.';
                }
            } else {
                notification.textContent = 'Sponsor details filled from ' + sponsor.year + '. Please upload new logos.';
            }
            document.querySelector('.form-section').appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 8000);
        }

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#sponsor-search') && !e.target.closest('#sponsor-results')) {
                document.getElementById('sponsor-results').innerHTML = '';
            }
        });

        // Function to update sponsor logo
        async function updateSponsorLogo(sponsorName, year) {
            console.log('updateSponsorLogo called:', sponsorName, year);

            // Check if sponsor has existing logo files
            try {
                const response = await fetch('/api/check-logo/' + year + '/' + encodeURIComponent(sponsorName));

                if (!response.ok) {
                    throw new Error('Failed to check logos: ' + response.status);
                }

                const result = await response.json();
                console.log('Logo check result:', result);

                if (result.existingLogos && result.existingLogos.length > 0) {
                    // Show existing logo options with choice to reprocess or upload new
                    const choice = confirm(
                        'Found ' + result.existingLogos.length + ' existing logo files for ' + sponsorName + ' (' + year + ')\\n\\n' +
                        'Click OK to reprocess existing logo with new approach\\n' +
                        'Click Cancel to upload a completely new logo'
                    );

                    if (choice) {
                        // Reprocess existing logo
                        await reprocessExistingLogo(sponsorName, year, result.existingLogos[0]);
                    } else {
                        // Allow uploading new logo - prefill form and switch to Add tab
                        prefillSponsorForm(sponsorName, year);
                        showTab('add');
                        showNotification('Switched to Add Sponsor tab. Form pre-filled for ' + sponsorName + ' (' + year + ')', 'info');
                    }
                } else {
                    // No existing logo, switch to Add tab and prefill
                    showNotification('No existing logos found for ' + sponsorName + ' (' + year + '). Opening Add Sponsor tab.', 'info');
                    prefillSponsorForm(sponsorName, year);
                    showTab('add');
                }
            } catch (error) {
                console.error('Error checking logos:', error);
                showNotification('Error checking existing logos: ' + error.message + '. Opening Add Sponsor tab.', 'error');
                // Fallback to prefill form
                prefillSponsorForm(sponsorName, year);
                showTab('add');
            }
        }

        // Helper function to show notifications
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            const bgColor = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007cba';
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: ' + bgColor + '; color: white; padding: 15px; border-radius: 5px; z-index: 9999; max-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 4000);
        }

        // Function to reprocess existing logo
        async function reprocessExistingLogo(sponsorName, year, existingLogo) {
            const statusDiv = document.createElement('div');
            statusDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #007cba; color: white; padding: 15px; border-radius: 5px; z-index: 9999;';
            statusDiv.textContent = 'Reprocessing ' + sponsorName + ' logo...';
            document.body.appendChild(statusDiv);

            try {
                const response = await fetch('/api/reprocess-logo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sponsorName: sponsorName,
                        year: year,
                        existingLogo: existingLogo
                    })
                });

                if (!response.ok) {
                    throw new Error('Server error: ' + response.status);
                }

                const result = await response.json();

                if (result.success) {
                    statusDiv.style.background = '#28a745';
                    statusDiv.textContent = '✅ Logo reprocessed successfully!';
                    setTimeout(() => {
                        document.body.removeChild(statusDiv);
                        loadSponsors(); // Refresh the view
                    }, 2000);
                } else {
                    statusDiv.style.background = '#dc3545';
                    statusDiv.textContent = '❌ Error: ' + (result.error || 'Unknown error');
                    setTimeout(() => document.body.removeChild(statusDiv), 4000);
                }
            } catch (error) {
                statusDiv.style.background = '#dc3545';
                statusDiv.textContent = '❌ Error: ' + error.message;
                setTimeout(() => document.body.removeChild(statusDiv), 4000);
            }
        }

        // Function to prefill sponsor form
        function prefillSponsorForm(sponsorName, year) {
            document.getElementById('name').value = sponsorName;
            document.getElementById('year').value = year;

            // Clear any existing search results
            document.getElementById('sponsor-results').innerHTML = '';
            document.getElementById('sponsor-search').value = '';
        }

        // Load sponsors on page load
        window.addEventListener('load', () => {
            loadSponsors();
        });
    </script>
</body>
</html>`
}

// HTTP Server
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true)
    const pathname = parsedUrl.pathname
    const method = req.method

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
    }

    try {
        if (pathname === '/' && method === 'GET') {
            // Serve the HTML interface
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(getHTML())
        } else if (pathname.startsWith('/images/sponsors/') && method === 'GET') {
            // Serve sponsor logo files
            const filename = pathname.split('/').pop()
            const filepath = path.join(SPONSORS_DIR, filename)

            try {
                await fs.access(filepath)
                const fileContent = await fs.readFile(filepath)
                const ext = path.extname(filename).toLowerCase()

                let contentType = 'application/octet-stream'
                if (ext === '.svg') {
                    contentType = 'image/svg+xml'
                } else if (ext === '.png') {
                    contentType = 'image/png'
                } else if (ext === '.jpg' || ext === '.jpeg') {
                    contentType = 'image/jpeg'
                }

                res.writeHead(200, { 'Content-Type': contentType })
                res.end(fileContent)
            } catch (error) {
                res.writeHead(404, { 'Content-Type': 'text/plain' })
                res.end('Logo file not found')
            }
        } else if (pathname === '/api/debug/config' && method === 'GET') {
            // Debug endpoint to check raw config content
            const year = parsedUrl.query.year || '2024'
            const configContent = await readYearConfig(year)

            if (configContent) {
                // Extract just the sponsors section for debugging
                const sponsorsMatch = configContent.match(/sponsors:\s*{([\s\S]*?)},?\s*\w+:/)
                const sponsorsSection = sponsorsMatch ? sponsorsMatch[1] : 'Not found'

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(
                    JSON.stringify({
                        year,
                        found: !!sponsorsMatch,
                        sponsorsSection: sponsorsSection.substring(0, 1000) + '...',
                        fullLength: configContent.length,
                    }),
                )
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Year not found' }))
            }
        } else if (pathname === '/api/sponsors/search' && method === 'GET') {
            // Search sponsors across all years
            const query = parsedUrl.query.q || ''
            const currentYear = parsedUrl.query.exclude || ''

            if (!query || query.length < 2) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify([]))
                return
            }

            const results = []
            const years = ['2024', '2023', '2022', '2021', '2020', '2019', '2018']

            for (const year of years) {
                if (year === currentYear) continue // Don't search current year

                try {
                    const sponsors = await getSponsorsByYear(year)
                    if (sponsors) {
                        for (const [tier, tierSponsors] of Object.entries(sponsors)) {
                            for (const sponsor of tierSponsors) {
                                if (sponsor.name && sponsor.name.toLowerCase().includes(query.toLowerCase())) {
                                    results.push({
                                        ...sponsor,
                                        year: year,
                                        tier: tier,
                                    })
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Skip years that don't have config files
                    print.warning(`Skipping year ${year}: ${error.message}`)
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(results.slice(0, 10))) // Limit to 10 results
        } else if (pathname.startsWith('/api/sponsors/') && method === 'GET') {
            // Get sponsors for a specific year using improved parsing
            const year = pathname.split('/')[3]
            const sponsors = await getSponsorsByYear(year)

            if (sponsors) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(sponsors))
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Year not found or no sponsors' }))
            }
        } else if (pathname === '/api/process-logo' && method === 'POST') {
            // Process uploaded logo
            let body = Buffer.alloc(0)

            req.on('data', (chunk) => {
                body = Buffer.concat([body, chunk])
            })

            req.on('end', async () => {
                try {
                    const contentType = req.headers['content-type']
                    const boundary = contentType.split('boundary=')[1]
                    const { files } = parseMultipart(body.toString('binary'), boundary)

                    if (files.logo) {
                        const result = await processLogo(files.logo.data, files.logo.filename)
                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify(result))
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ success: false, error: 'No logo file uploaded' }))
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname === '/api/copy-logos' && method === 'POST') {
            // Copy existing logos to new year
            let body = Buffer.alloc(0)

            req.on('data', (chunk) => {
                body = Buffer.concat([body, chunk])
            })

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body.toString())
                    const { sponsor, toYear } = data

                    if (!sponsor || !toYear) {
                        throw new Error('Missing sponsor or toYear')
                    }

                    const sponsorNameSlug = sponsor.name.toLowerCase().replace(/\s+/g, '-')
                    const variants = ['light', 'dark']
                    const copiedFiles = []

                    // Try to copy each variant
                    for (const variant of variants) {
                        const originalUrl = sponsor[`logoUrl${variant.charAt(0).toUpperCase() + variant.slice(1)}Mode`]

                        if (originalUrl) {
                            const originalFilename = originalUrl.split('/').pop()
                            const originalPath = path.join(SPONSORS_DIR, originalFilename)

                            try {
                                await fs.access(originalPath)
                                const ext = path.extname(originalFilename)
                                const newFilename = `${toYear}-${sponsorNameSlug}-${variant}${ext}`
                                const newPath = path.join(SPONSORS_DIR, newFilename)

                                await fs.copyFile(originalPath, newPath)
                                copiedFiles.push(newFilename)
                            } catch (copyError) {
                                print.warning(`Could not copy ${variant} logo: ${copyError.message}`)
                            }
                        }
                    }

                    print.success(`Copied ${copiedFiles.length} logo files for ${sponsor.name} to ${toYear}`)

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(
                        JSON.stringify({
                            success: true,
                            copiedFiles: copiedFiles,
                            message: `Copied ${copiedFiles.length} logo variants`,
                        }),
                    )
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname === '/api/sponsors' && method === 'POST') {
            // Save sponsor with processed logos
            let body = Buffer.alloc(0)

            req.on('data', (chunk) => {
                body = Buffer.concat([body, chunk])
            })

            req.on('end', async () => {
                try {
                    const contentType = req.headers['content-type']
                    const boundary = contentType.split('boundary=')[1]
                    const { parts, files } = parseMultipart(body.toString('binary'), boundary)

                    const { name, website, tier, quote, year, logoData } = parts
                    const logos = logoData ? JSON.parse(logoData) : null

                    if (!name || !tier || !year) {
                        throw new Error('Missing required fields: name, tier, year')
                    }

                    // Generate sponsor object
                    const sponsorNameSlug = name.toLowerCase().replace(/\s+/g, '-')

                    // Determine correct file extension
                    let ext = 'svg' // default
                    if (logos && files.logo) {
                        ext = files.logo.filename.endsWith('.svg') ? 'svg' : 'png'
                    }

                    const sponsorObj = {
                        name: name,
                        website: website || '',
                        logoUrlDarkMode: `/images/sponsors/${year}-${sponsorNameSlug}-dark.${ext}`,
                        logoUrlLightMode: `/images/sponsors/${year}-${sponsorNameSlug}-light.${ext}`,
                        quote: quote || '',
                    }

                    // Save logo files if provided
                    if (logos && files.logo) {
                        // Save light and dark variants only
                        const variants = ['light', 'dark']
                        for (const variant of variants) {
                            if (logos[variant]) {
                                const base64Data = logos[variant].split(',')[1]
                                const buffer = Buffer.from(base64Data, 'base64')
                                const filename = `${year}-${sponsorNameSlug}-${variant}.${ext}`
                                const filepath = path.join(SPONSORS_DIR, filename)
                                await fs.writeFile(filepath, buffer)
                            }
                        }
                    }

                    // Automatically add sponsor to config file
                    const configUpdated = await addSponsorToConfig(year, tier, sponsorObj)

                    print.success(`Sponsor "${name}" prepared for ${year}`)
                    print.info('Generated configuration:')
                    print.info(JSON.stringify(sponsorObj, null, 2))

                    if (configUpdated) {
                        print.success(`✅ Sponsor automatically added to: website/app/config/years/${year}.server.ts`)
                        print.success(`Added to "${tier}" array in the sponsors section`)
                    } else {
                        print.warning(`❌ Could not automatically add to config file`)
                        print.warning(`Please manually add this to: website/app/config/years/${year}.server.ts`)
                        print.warning(`Under the "${tier}" array in the sponsors section`)
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(
                        JSON.stringify({
                            success: true,
                            message: 'Sponsor processed successfully',
                            config: sponsorObj,
                        }),
                    )
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname.startsWith('/api/check-logo/') && method === 'GET') {
            // Check for existing logos: /api/check-logo/2025/MakerX
            const pathParts = pathname.split('/')
            const year = pathParts[3]
            const sponsorName = decodeURIComponent(pathParts[4])

            const sponsorNameSlug = sponsorName.toLowerCase().replace(/\s+/g, '-')
            const variants = ['light', 'dark']
            const extensions = ['svg', 'png']
            const existing = []

            for (const ext of extensions) {
                const filename = `${year}-${sponsorNameSlug}.${ext}`
                const filepath = path.join(SPONSORS_DIR, filename)
                try {
                    await fs.access(filepath)
                    existing.push({ extension: ext, filename, filepath })
                } catch {
                    console.log(`No file: ${filepath}`)
                    // File doesn't exist
                }
            }

            for (const variant of variants) {
                for (const ext of extensions) {
                    const filename = `${year}-${sponsorNameSlug}-${variant}.${ext}`
                    const filepath = path.join(SPONSORS_DIR, filename)
                    try {
                        await fs.access(filepath)
                        existing.push({ variant, extension: ext, filename, filepath })
                    } catch {
                        console.log(`No file: ${filepath}`)
                        // File doesn't exist
                    }
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ existingLogos: existing }))
        } else if (pathname === '/api/update-logo-config' && method === 'POST') {
            // Update sponsor logo URLs in config file
            let body = ''
            req.on('data', (chunk) => {
                body += chunk.toString()
            })

            req.on('end', async () => {
                try {
                    const { sponsorName, year, logoUrlDarkMode, logoUrlLightMode } = JSON.parse(body)

                    if (!sponsorName || !year || !logoUrlDarkMode || !logoUrlLightMode) {
                        throw new Error('Missing required fields: sponsorName, year, logoUrlDarkMode, logoUrlLightMode')
                    }

                    const updated = await updateSponsorLogoInConfig(
                        year,
                        sponsorName,
                        logoUrlDarkMode,
                        logoUrlLightMode,
                    )

                    if (updated) {
                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(
                            JSON.stringify({
                                success: true,
                                message: `Successfully updated logo URLs for ${sponsorName} in ${year} config`,
                            }),
                        )
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(
                            JSON.stringify({
                                success: false,
                                error: `Failed to update config for ${sponsorName} in ${year}`,
                            }),
                        )
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else if (pathname === '/api/reprocess-logo' && method === 'POST') {
            // Reprocess existing logo
            let body = ''
            req.on('data', (chunk) => {
                body += chunk.toString()
            })

            req.on('end', async () => {
                try {
                    const { sponsorName, year, existingLogo } = JSON.parse(body)

                    // Read the existing logo file
                    const logoBuffer = await fs.readFile(existingLogo.filepath)

                    // Process it with the new two-step approach
                    const result = await processLogo(logoBuffer, existingLogo.filename)
                    console.log('Reprocess result:', result)
                    if (result.success) {
                        // Save the processed logos
                        const sponsorNameSlug = sponsorName.toLowerCase().replace(/\s+/g, '-')
                        const ext = existingLogo.extension

                        const lightPath = path.join(SPONSORS_DIR, `${year}-${sponsorNameSlug}-light.${ext}`)
                        const darkPath = path.join(SPONSORS_DIR, `${year}-${sponsorNameSlug}-dark.${ext}`)

                        // Convert base64 back to buffer and save
                        let lightBuffer, darkBuffer

                        if (result.light && typeof result.light === 'string') {
                            const lightBase64 = result.light.replace(/^data:image\/[^;]+;base64,/, '')
                            lightBuffer = Buffer.from(lightBase64, 'base64')
                        } else {
                            throw new Error('Invalid light data received')
                        }

                        if (result.dark && typeof result.dark === 'string') {
                            const darkBase64 = result.dark.replace(/^data:image\/[^;]+;base64,/, '')
                            darkBuffer = Buffer.from(darkBase64, 'base64')
                        } else {
                            throw new Error('Invalid dark data received')
                        }

                        await fs.writeFile(lightPath, lightBuffer)
                        await fs.writeFile(darkPath, darkBuffer)

                        print.success(`Reprocessed logos for ${sponsorName} (${year})`)
                        print.info(`Light mode: ${lightPath}`)
                        print.info(`Dark mode: ${darkPath}`)

                        // Update the config file with new logo URLs
                        const logoUrlLightMode = `/images/sponsors/${year}-${sponsorNameSlug}-light.${ext}`
                        const logoUrlDarkMode = `/images/sponsors/${year}-${sponsorNameSlug}-dark.${ext}`

                        const configUpdated = await updateSponsorLogoInConfig(
                            year,
                            sponsorName,
                            logoUrlDarkMode,
                            logoUrlLightMode,
                        )

                        if (configUpdated) {
                            print.success(`Updated config for ${sponsorName} with new logo URLs`)
                        } else {
                            print.warning(`Logo files saved but config update failed for ${sponsorName}`)
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(
                            JSON.stringify({
                                success: true,
                                message: 'Logo reprocessed successfully',
                                configUpdated: configUpdated,
                            }),
                        )
                    } else {
                        throw new Error(result.error || 'Processing failed')
                    }
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ success: false, error: error.message }))
                }
            })
        } else {
            // 404 Not Found
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Not Found' }))
        }
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: error.message }))
    }
})

// Start server
server.listen(config.port, () => {
    print.success(`${config.appName} running at http://localhost:${config.port}`)
    print.info('Use this interface to:')
    print.info('• Add new sponsors with logo processing')
    print.info('• View existing sponsors by year')
    print.info('• Preview all logo variants before approval')
    print.info('• Generate TypeScript config snippets')
    print.info('')
    print.info(`Open http://localhost:${config.port} in your browser`)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
    print.info('Shutting down server...')
    server.close(() => {
        print.success('Server stopped')
        process.exit(0)
    })
})
