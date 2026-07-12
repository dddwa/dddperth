<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Wrangler commands

Always give wrangler commands in their Nx form, using the `wrangler` passthrough target (runs `pnpm exec wrangler` from `core/website`, so config paths are relative to that directory):

```bash
pnpm nx wrangler website -- <wrangler args>
# e.g.
pnpm nx wrangler website -- secret list -c ../../conference/wrangler/production.jsonc
```

Prefer the dedicated targets where they exist (`d1-migrate-local|staging|production`, `deploy-staging`, `deploy-production`) over raw wrangler equivalents.

# Testing time-gated features (voting, CFP, ticket releases, agenda)

Admins can override the website's current date/time at `/admin/settings` ("Set Override" / "Quick Jump to Important Dates"). The override is stored in the `__adminDateTime` cookie and only affects that admin's own session — the public site is untouched, so it is safe to use in production too.

Use this override to test date-gated behaviour (e.g. jump past a voting/CFP open date) instead of editing the dates in `conference/config/years/*.ts`. In local dev, admin access works without login (`WEBSITE_AUTH_REQUIRED=false` in `conference/wrangler/local.jsonc`).
