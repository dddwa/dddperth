# DDD Perth Sponsor Management

## Overview

This document describes the sponsor management system for DDD Perth conferences. The system handles sponsor data, logo processing, and ensures visual equality through standardized black/white logo versions.

## System Components

### 1. CLI Tool (`scripts/sponsor-manager.mjs`)

Command-line interface for sponsor operations.

### 2. Web UI (`scripts/add-sponsor.mjs`)

Visual interface for sponsor management and logo approval.

### 3. Logo Processing Pipeline

Automated conversion of logos to dark/light/black/white variants.

## Quick Start

### Adding a New Sponsor

```bash
# Add a new sponsor with interactive prompts
node scripts/sponsor-manager.mjs add --year 2025 --name "CompanyName" --tier gold

# Import sponsor from previous year
node scripts/sponsor-manager.mjs import --from 2024 --to 2025 --sponsor "Bankwest"

# Launch web UI for visual management
node scripts/sponsor-manager.mjs ui
```

## Logo Naming Convention

All sponsor logos follow this naming pattern:

```
{year}-{sponsor-name}-{variant}.{extension}

Examples:
2025-bankwest-dark.svg    # Dark mode version
2025-bankwest-light.svg   # Light mode version
2025-bankwest-black.svg   # Pure black (for print/equality)
2025-bankwest-white.svg   # Pure white (for overlays)
```

## Logo Processing Workflow

### Automatic Processing

1. **Upload Original Logo**

    - Preferred format: SVG
    - Fallback: PNG with transparent background

2. **Generate Variants**

    - The system attempts automatic conversion using Sharp
    - Creates dark, light, black, and white versions
    - Preserves logo integrity and shapes

3. **Review & Approve**
    - Visual comparison in web UI
    - Side-by-side preview of all variants
    - Approve or request manual adjustment

### Manual Processing for Problematic Logos

When automatic processing fails to preserve logo integrity:

1. **Review Failed Conversion**

    - The web UI will highlight missing elements or shape issues
    - Original logo displayed alongside failed conversions

2. **AI-Assisted Correction**

    - Use the provided prompt template with ChatGPT or Claude
    - Upload original logo and describe the issue
    - Request black/white versions that preserve all elements

3. **Manual SVG Editing** (for SVG files)
    - Open SVG in text editor
    - Replace color values with #000000 (black) or #FFFFFF (white)
    - Ensure all paths and shapes are preserved

### AI Prompt Template for Logo Conversion

```
I need to create black and white versions of this company logo for print materials.
The logo must maintain complete brand integrity - all shapes, text, and design
elements must be preserved exactly as they appear in the original.

Requirements:
1. Create a pure black (#000000) version on transparent background
2. Create a pure white (#FFFFFF) version on transparent background
3. Preserve ALL elements - no missing parts or incomplete shapes
4. Maintain the exact proportions and layout
5. If the logo has a background shape, preserve it as part of the design

Please analyze the attached logo and provide the converted versions.
```

## Sponsor Tiers

Sponsors are categorized into tiers (defined in year config files):

- **Platinum** - Highest tier
- **Gold**
- **Silver**
- **Digital**
- **Bronze**
- **Community**
- **Coffee Cart** - Special category
- **Quiet Room** - Special category

## Year Configuration

Sponsor data is stored in: `website/app/config/years/{year}.server.ts`

### Sponsor Object Structure

```typescript
{
  name: string,              // Company name
  website: string,           // Company website URL
  logoUrlDarkMode: string,   // Path to dark mode logo
  logoUrlLightMode: string,  // Path to light mode logo
  quote?: string            // Optional sponsor quote
}
```

## API Endpoints (Web UI)

### GET `/api/sponsors/:year`

Returns all sponsors for a given year.

### POST `/api/sponsors/:year`

Add a new sponsor to a year.

### PUT `/api/sponsors/:year/:sponsorName`

Update existing sponsor details.

### POST `/api/sponsors/:year/:sponsorName/logo`

Upload and process sponsor logo.

### GET `/api/sponsors/:year/:sponsorName/preview`

Preview all logo variants for approval.

## Bulk Import Process

For importing multiple sponsors (e.g., from a folder of logos):

1. **Prepare Folder Structure**

    ```
    2025-sponsors/
    ├── platinum/
    │   ├── bankwest.svg
    │   └── makerx.png
    ├── gold/
    │   └── insight.svg
    └── metadata.json  # Optional sponsor details
    ```

2. **Use Bulk Import API**

    ```bash
    curl -X POST http://localhost:3801/api/sponsors/bulk-import \
      -F "year=2025" \
      -F "folder=@2025-sponsors.zip"
    ```

3. **Review in Web UI**
    - Navigate to http://localhost:3801/2025
    - Review each imported sponsor
    - Approve logo conversions

## Troubleshooting

### Common Issues

**Logo conversion missing elements**

- Use manual AI-assisted conversion
- Check if logo has gradients or complex effects
- Consider keeping as PNG if SVG conversion loses quality

**Black/white versions look identical to dark/light**

- Ensure complete color replacement (not just darkening)
- Check for semi-transparent elements
- Verify all color values are pure black (#000000) or white (#FFFFFF)

**Sponsor already exists error**

- Check if sponsor name matches exactly (case-sensitive)
- Use update command instead of add
- Verify year is correct

## Best Practices

1. **Always Request SVG Format**

    - Ask sponsors for vector logos when possible
    - Easier to edit and scale
    - Better conversion results

2. **Verify Logo Updates**

    - Companies rebrand regularly
    - Always confirm logo is current when importing from previous years
    - Keep historical logos for reference

3. **Test All Variants**

    - Preview logos on both dark and light backgrounds
    - Ensure black/white versions maintain brand recognition
    - Check for visual equality (no sponsor stands out due to color)

4. **Document Changes**
    - Note when logos are updated
    - Track any manual adjustments made
    - Record sponsor tier changes between years

## Legacy Logo Migration

For updating logos from 2018-2023, see: [Legacy Migration Guide](./legacy-migration.md)
