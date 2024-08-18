// Menu Object

export interface MenuItem {
  title: string
  type: string
  link: string
  subPages?: MenuItem[]
}

export const menuData: MenuItem[] = [
  {
    title: 'Event',
    type: 'Header',
    link: '/event',
    subPages: [
      {
        title: 'Venue',
        type: 'Link',
        link: '/event/venue',
      },
      {
        title: 'Speakers',
        type: 'Link',
        link: '/event/speakers',
      },
      {
        title: 'Sponsors',
        type: 'Link',
        link: '/event/sponsors',
      },
    ],
  },
  {
    title: 'Agenda',
    type: 'Header',
    link: '/agenda',
    subPages: [
      {
        title: 'Past Agenda',
        type: 'Link',
        link: '/agenda/past-agenda',
      },
    ],
  },
  {
    title: 'About',
    type: 'Header',
    link: '/about',
    subPages: [
      {
        title: 'FAQs',
        type: 'Link',
        link: '/about/faqs',
      },
      {
        title: 'Code of Conduct',
        type: 'Link',
        link: '/about/code-of-conduct',
      },
      {
        title: 'Covid-19 Policy',
        type: 'Link',
        link: '/about/covid-19-policy',
      },
      {
        title: 'Work with us',
        type: 'Link',
        link: '/about/work-with-us',
      },
    ],
  },
  {
    title: 'Blog',
    type: 'Link',
    link: '/blog',
  },
]
