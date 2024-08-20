# Website Content

To create new pages in the website just create a new markdown file in the `website-content/pages` directory. The file should have an `.mdx` extension.

## Frontmatter

Each markdown file should have a frontmatter section at the top of the file. This is a YAML section that contains metadata about the page. The frontmatter section should be surrounded by three dashes `---` at the top of the file.

### Frontmatter options

| Option    | Required | Description                     |
| --------- | -------- | ------------------------------- |
| `title`   | Yes      | The title of the page.          |
| `summary` |          | A short summary of the page.    |
| `layout`  |          | The layout to use for the page. |
| `date`    |          | The date the page was created.  |

## Referencing conference data

Rather than hardcoding conference data into the website, we can reference the data from the conference data file. This allows us to update the conference data in one place and have it reflected across the website.

You access data with braces, eg. `{property}`

### Available data

| Property                     | Description                                 |
| ---------------------------- | ------------------------------------------- |
| props.conference.year        | The current year of the conference          |
| props.conference.ticketPrice | The current ticket price for the conference |
| props.conference.date        | The date of this year's conference          |
| props.conference.votingOpens | The date of this year's conference          |

### Current phase data

In addition to data, the following is available to show and hide content based on the current phase of the conference, eg ticket sales open.

| Property | Description |
| -------- | ----------- |

### Components

The following components are available to use in the markdown files:
