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

## Adelaide-specific context

This repository is a fork of DDD Perth (`dddwa/dddperth`), maintained independently by the DDD Adelaide team. We may periodically sync upstream changes from Perth, but we do not contribute changes back upstream.

**Upstream baseline SHA:** `324e8c558fe46082f0c68c7568eb1ee4c58cc88d`

**Schema divergences from Perth (do not blindly merge upstream changes that conflict with these):**

- `YearSponsors` shape uses Adelaide tiers: `platinum`, `gold`, `service` (with `serviceProvided` field), `silver`, `saSponsors`. Replaces Perth's `digital`/`room`/`community` tiers. *(Schema change scheduled for Stage 3 PR 3b — not yet applied.)*
- Only year config is `2026`; Perth's historical year configs (`2018-2025`) will be removed in Stage 3.

**Local dev setup gotcha:** the Express server validates env vars via Zod on boot and crashes if any are missing. Always `cp website/.env.example website/.env` before `pnpm start`. Required keys are documented in [README.md](README.md#required-environment-variables).

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
