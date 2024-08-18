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

You access data with braces, eg. `{props.{property}}`

### Available data

| Property                                             | Description                                        |
| ---------------------------------------------------- | -------------------------------------------------- |
| name                                                 | The name of the conference                         |
| description                                          | A brief description of the conference              |
| blogDescription                                      | A description for the conference blog              |
| current.year                                         | The current year of the conference                 |
| current.ticketPrice                                  | The current ticket price for the conference        |
| current.conferenceDate                               | The date of this year's conference                 |
| current.venue.name                                   | The name of the conference venue                   |
| previous['Year'].conferenceDate                      | The date of a previous year's conference           |
| previous['Year'].venue.name                          | The name of a previous year's conference venue     |
| importantContacts.police.details                     | Details for the local police                       |
| importantContacts.police.phone                       | Phone number for the local police                  |
| importantContacts.police.mapUrl                      | Map URL for the local police station               |
| importantContacts.centreAgainstSexualAssault.Details | Details for the Centre Against Sexual Assault      |
| importantContacts.centreAgainstSexualAssault.Phone   | Phone number for the Centre Against Sexual Assault |
| importantContacts.emergencyMedical.details           | Details for the emergency medical service          |
| importantContacts.emergencyMedical.mapUrl            | Map URL for the emergency medical service          |
| importantContacts.nonEmergencyMedical.details        | Details for the non-emergency medical service      |
| importantContacts.nonEmergencyMedical.phone          | Phone number for the non-emergency medical service |
| importantContacts.nonEmergencyMedical.mapUrl         | Map URL for the non-emergency medical service      |
| socials.twitter.id                                   | Twitter ID for the conference                      |
| socials.twitter.name                                 | Twitter name for the conference                    |
| socials.facebook                                     | Facebook page for the conference                   |
| socials.flickr                                       | Flickr page for the conference                     |
| socials.youtube                                      | YouTube channel for the conference                 |
| socials.blog                                         | Blog for the conference                            |
| socials.email                                        | Email for the conference                           |
| socials.mailingList                                  | Mailing list for the conference                    |
| socials.gitHub                                       | GitHub page for the conference                     |
| socials.instagram                                    | Instagram page for the conference                  |
| socials.linkedin                                     | LinkedIn page for the conference                   |

### Current phase data

In addition to data, the following is available to show and hide content based on the current phase of the conference, eg ticket sales open.

| Property | Description |
| -------- | ----------- |

### Components

The following components are available to use in the markdown files:
