# Content pages

This folder contains the MDX pages rendered by the website. Each `.mdx` file becomes a page at `/<filename>` (e.g. `about.mdx` → `/about`).

## Frontmatter

```yaml
---
title: 'Page title'
summary: 'Short summary used in meta description and link previews.'
---
```

## Underscore-prefixed slugs

Files starting with `_` (e.g. `_home-hero.mdx`, `_acknowledgement.mdx`) are **fragments** — they're embedded in other components rather than rendered as standalone pages. They:

- Don't appear in the sitemap
- Don't respond to direct navigation (the catchall route 404s them)
- Are wired into core components via `conferenceManifest.homepage.*Slug` references

Use this pattern when a fork wants to swap a chunk of copy in a core component (the home-page hero blurb, the footer Country acknowledgement) without forking the component itself.

## Adding a new page

1. Create `<slug>.mdx` here with frontmatter
2. Add a link from somewhere users can navigate to (footer, main nav, or another page)
3. The MDX bundler picks it up automatically on next dev-server reload
