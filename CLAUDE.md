# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the DDD Perth conference website built with:

- **Nx** monorepo management
- **React Router v7** (Remix successor) with SSR
- **PandaCSS** + **Park UI** for styling
- **TypeScript** throughout
- **Vite** for development server and building
- **Express** server with OpenTelemetry instrumentation

## Essential Commands

### Development

```bash
# Install dependencies (uses pnpm)
pnpm i

# Start development server (http://localhost:3800)
pnpm start

# Alternative: start from website directory
cd website && node --inspect=127.0.0.1:9600 ./build/server/server.js
```

### Build & Test

```bash
# Build all projects
pnpm build

# Lint all projects
pnpm lint

# Run tests
pnpm test

# Clean build artifacts (preserves .env)
pnpm clean
```

### Nx Commands

```bash
# Run specific target for website project
nx <target> website

# Examples:
nx build website
nx serve website
nx lint website

# Show project graph
nx graph
```

### UI Development

```bash
# Add Park UI components
pnpm nx parkui website add <component>

# Run Panda CSS commands
pnpm nx panda website <command>
```

## Architecture

### Project Structure

- **`/website`** - Main React Router application
    - `app/` - Application code (components, routes, config)
    - `styled-system/` - Generated PandaCSS files
    - `build/` - Build outputs (remix & server)
    - `server.ts` - Express server with OpenTelemetry
- **`/website-content`** - MDX content files for static pages
- **`/blog`** - Blog posts in markdown
- **`/infra`** - Azure Bicep infrastructure files

### Key Application Patterns

1. **Routing**: Uses React Router v7 with file-based routing

    - Routes defined in `website/app/routes/`
    - Layout routes use `_layout` prefix
    - Dynamic segments use `$param` syntax

2. **Conference Data**: Year-based configuration

    - Config files in `website/app/config/years/`
    - Main config in `conference-config.ts`
    - Each year has sponsors, dates, venues, etc.

3. **Content Management**:

    - MDX files compiled at runtime using `mdx-bundler`
    - Blog posts with frontmatter metadata
    - Static page content in `/website-content/pages/`

4. **Styling**: PandaCSS with Park UI preset

    - Recipes defined in `website/app/recipes/`
    - Components use generated CSS functions
    - Responsive design with Panda conditions

5. **Data Fetching**:

    - Sessionize API for agenda/speakers
    - Tito API for ticketing
    - GitHub API for content
    - EventsAir API for conference data

6. **Observability**: OpenTelemetry instrumentation
    - Traces, metrics, and logs
    - Azure Monitor exporter available
    - Local Jaeger for development

## Development Notes

- The project uses ESM modules throughout
- Node 20+ required
- pnpm is the package manager (enforced via corepack)
- Build outputs are in `website/build/` directory
- Static assets served from `website/public/`
- Environment variables loaded from `website/.env`

## Testing

Currently no test files are present in the codebase. The test commands are configured but tests need to be implemented.

## Voting System

The project includes a voting system for conference talk selection:

### Local Development

```bash
# Install Azurite for local Azure Storage emulation
npm install -g azurite

# Start Azurite (in separate terminal)
./start-azurite.sh

# Visit /voting to test voting
# Visit /voting/results to see results
```

### Key Files

- `app/lib/azure-storage.server.ts` - Azure Storage operations
- `app/lib/voting.server.ts` - Voting business logic
- `app/routes/_layout.voting.tsx` - Voting UI
- `app/routes/_layout.voting.results.tsx` - Results page

See VOTING.md for detailed documentation.
