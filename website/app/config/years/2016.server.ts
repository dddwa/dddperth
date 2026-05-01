import { DateTime } from 'luxon'
import type { ConferenceYear } from '../../lib/config-types.server'
import { mercureHotelVenue } from '../venues/mercure-hotel'

export const conference2016: ConferenceYear = {
    kind: 'conference',
    year: '2016',
    conferenceDate: DateTime.fromISO('2016-08-27T08:30:00', { zone: 'Australia/Perth' }),
    sessionizeUrl: undefined,

    venue: mercureHotelVenue,
    sessions: {
        kind: 'session-data',
        sessions: [
  {
    "date": "2016-08-27T00:00:00",
    "isDefault": true,
    "rooms": [
      {
        "id": 0,
        "name": "Main Room",
        "sessions": [
          {
            "id": "registration",
            "title": "Registration",
            "description": null,
            "startsAt": "2016-08-27T08:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "welcome-and-housekeeping",
            "title": "Welcome and housekeeping",
            "description": null,
            "startsAt": "2016-08-27T09:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "c86a3b2b-0985-48b8-b86a-73d84a779ca2",
            "title": "Welcome to the world of Tomorrow!",
            "description": "The DDD community is growing and moving into areas and platforms that we could only dream of just a few years ago. Our industry is changing, our tools are changing and the things we are building are changing. \n\nIn this talk we'll have a look at where we've been, where we are and where we are going. We'll look at some of the things that are happening in the DDD community and some of the things that are happening in the wider industry. \n\nWelcome to the world of Tomorrow!",
            "startsAt": "2016-08-27T09:30:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Brendan Forster",
                "name": "Brendan Forster"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "morning-tea",
            "title": "Morning tea",
            "description": null,
            "startsAt": "2016-08-27T10:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "e8690859-99f5-4f96-80f4-5369c76251ef",
            "title": "Wait, I didn't mean to do that!",
            "description": "When you have a highly collaborative application, with many different people changing the same data, how can we help people feel safe? What does it take to create a world where a user can make an error, say \"oops!\" and go back to safety?\n\nJoin us as we take a high level look at why you shouldn't use CRUD, and why you should use a task-based UI. We'll explore the conceptual differences between 'Undo' and 'Cancel', and even touch on Event Sourcing.",
            "startsAt": "2016-08-27T10:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Matt Davies and Rob Crowley",
                "name": "Matt Davies and Rob Crowley"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "Main Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T11:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "186a3455-89f4-4458-94f4-63854a889ce3",
            "title": "Azure DocumentDB - Beyond the buzzwords",
            "description": "Join us as we look at Microsoft's newest first-class database citizen, Azure DocumentDB. We'll look at the core concepts of DocumentDB including how it handles JSON, how it provides planetary scale and how it provides extremely high throughput.\n\nMore importantly, we'll dive deeper and look at the areas where it is different to other NoSQL stores, and where that makes it better or worse. We'll look at partitioning, indexes and server-side logic in the form of stored procedures, triggers and UDFs (all written in JavaScript).",
            "startsAt": "2016-08-27T11:35:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Simon Waight",
                "name": "Simon Waight"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "Main Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T12:20:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "90e0e047-8975-43ea-938f-a9657f864e29",
            "title": "Microservices... why would I even?",
            "description": "Wait, don't leave! This is NOT another talk about why microservices are the new panacea that will fix all your problems, give you clear skin and help you find love. This is a talk about the hard stuff. \n\nWhat are the actual reasons you'd want to build a system with microservices? What are the actual trade-offs? What does your team and your culture need to look like? We'll explore some of the lessons learned (some the hard way) building and running systems with microservices, and why you might just want to stick with a monolith after all.",
            "startsAt": "2016-08-27T12:25:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Joseph Cooney",
                "name": "Joseph Cooney"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "Main Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "lunch",
            "title": "Lunch",
            "description": null,
            "startsAt": "2016-08-27T12:50:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "ccbb469f-5406-48dc-8e70-d20a84dd2044",
            "title": "RoboCup Junior Australia Rescue Robots",
            "description": "RoboCup Junior is a project-oriented educational initiative that sponsors local, regional and international robotic events for young students. It is designed to introduce RoboCup to primary and secondary school children. The focus in the junior league is on education. RoboCup is an international effort whose purpose is to foster Artificial Intelligence (AI) and robotics research by providing a standard problem where a wide range of technologies can be integrated and examined. Created in a true cooperative spirit, the RoboCup Junior Educational Competition encompasses not only engineering and IT skills, but extends right across a school curriculum. RoboCup Junior also addresses social development by encouraging sportsmanship, sharing, teamwork, understanding of differences between individuals and nations, cooperation and organisational skills.\n\nThe competition is divided into Rescue, Dance and Soccer divisions and the Australian Open National competition will be held in Sydney on 16th to 18th September 2016. For more information see http://robocupjunior.org.au/.",
            "startsAt": "2016-08-27T12:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "All Saints College students",
                "name": "All Saints College students"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "477cabb8-4ca8-4f72-8e64-1cd11f6b2602",
            "title": "CQRS and Event Sourcing For The Win!",
            "description": "Command Query Responsibility Segregation (CQRS) is an important architectural pattern for enterprise applications.  It offers a number of important benefits for more complex and collaborative applications. This presentation will give a quick introduction to and overview of CQRS within a Domain Driven Design (DDD) context.  CQRS applications can also benefit from the use of Event Sourcing (ES). This presentation will give an introduction to and overview of CQRS using Event Sourcing.\n\nHowever, the second part of the presentation will be an investigation of whether events are the ultimate and most timeless way to persist application state (without actually persisting application state). The ability to construct and reconstruct data stores on the read-side enables post-hoc optimisations of data representation for queries. The ability to change paradigms on the application write-side means that the data representation is perhaps even more powerful and timeless than relational stores.",
            "startsAt": "2016-08-27T13:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Ashley Aitken",
                "name": "Ashley Aitken"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "Main Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T14:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "24a69d28-172d-4e77-90d3-190e221b7c60",
            "title": "Random Failures of Architecture I Have Committed",
            "description": "Everyone loves to talk themselves up in conference presentations, regaling you with tales of their technical brilliance. Sure these talks can be filled with valuable information about the latest technologies, but have you ever stopped to consider how it makes you, the audience, feel? After you've spent the weekend hearing about reactively programmed event sourced games running in the cloud isn't hard to go back to writing CRUD forms using ASP.NET WebForms 3.5 against an Access DB? Don't you want someone to stand up and tell you all the ways they've screwed up so you can feel better about the code that awaits you on Monday? \n\nThis is that talk. \n\nIt's taken Colin 17 years to learn these things through failures big and small. Now you can learn such classic mistakes as inappropriate layering, leaky abstractions, reimplementing perfectly valid frameworks because reasons, undervaluing the cost of development friction, and so much more. All this (probably, maybe) in just one session the length of which I did not bother to research. Yours to take away so you can laugh smugly at me when you fail to do so in your career*. Vote now but don't send any money. \n\n*offer void where prohibited",
            "startsAt": "2016-08-27T14:35:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Colin Scott",
                "name": "Colin Scott"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "Main Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "afternoon-tea",
            "title": "Afternoon tea",
            "description": null,
            "startsAt": "2016-08-27T15:20:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "sponsor-announcements-and-prize-draw!!!",
            "title": "Sponsor announcements and PRIZE DRAW!!!",
            "description": null,
            "startsAt": "2016-08-27T15:35:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "82988c58-8d9c-4518-a4f7-94cf7739299d",
            "title": "The Force Awakens: Mastering Your Inner Developer",
            "description": "It takes effort and discipline to be a great developer, but how do you know what to focus on, what to pursue, what to say no to? And how do you fit it all into an already packed life of family, friends, discovery and ambition?\n\nGetting a grasp on key professional skills, such as time management, learning to say no, building a network and, most importantly, keeping an open mind is no simple task. This talk will provide guidance and share personal experiences on how to build up the life of your creation, rather than the life you have settled for. From managing 3 businesses, being an author and speaker, organising conferences, giving as much back to the community as possible as well as being a father and partner, there are gold nuggets aplenty in this talk. Be inspired to think beyond yourself.",
            "startsAt": "2016-08-27T16:10:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Lars Klint",
                "name": "Lars Klint"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "thank-yous-and-wrap-up",
            "title": "Thank yous and wrap up",
            "description": null,
            "startsAt": "2016-08-27T16:55:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "afterparty",
            "title": "Afterparty",
            "description": null,
            "startsAt": "2016-08-27T17:00:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          }
        ],
        "hasOnlyPlenumSessions": false
      },
      {
        "id": 1,
        "name": "Side Room 1",
        "sessions": [
          {
            "id": "registration",
            "title": "Registration",
            "description": null,
            "startsAt": "2016-08-27T08:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "welcome-and-housekeeping",
            "title": "Welcome and housekeeping",
            "description": null,
            "startsAt": "2016-08-27T09:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "c86a3b2b-0985-48b8-b86a-73d84a779ca2",
            "title": "Welcome to the world of Tomorrow!",
            "description": "The DDD community is growing and moving into areas and platforms that we could only dream of just a few years ago. Our industry is changing, our tools are changing and the things we are building are changing. \n\nIn this talk we'll have a look at where we've been, where we are and where we are going. We'll look at some of the things that are happening in the DDD community and some of the things that are happening in the wider industry. \n\nWelcome to the world of Tomorrow!",
            "startsAt": "2016-08-27T09:30:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Brendan Forster",
                "name": "Brendan Forster"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "morning-tea",
            "title": "Morning tea",
            "description": null,
            "startsAt": "2016-08-27T10:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "e8418f77-9875-43ea-9123-a86a489146e2",
            "title": "CSS for developers who hate CSS",
            "description": "Do you find yourself fighting with CSS? Do you find yourself adding !important to everything? Do you find yourself wondering why your styles aren't being applied? \n\nIn this session we'll look at some of the core concepts of CSS that often trip up developers. We'll look at the cascade, specificity, and the box model. We'll also look at some modern CSS techniques that make styling your applications a lot easier and more predictable.",
            "startsAt": "2016-08-27T10:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Justin King",
                "name": "Justin King"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room 1",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T11:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "67290159-45e3-4923-a123-b78c4a9143e1",
            "title": "Hacking the human - why security is more than just code",
            "description": "We spend a lot of time thinking about how to make our code secure, but what about the people who use our systems? In this session we'll look at social engineering and how attackers can bypass even the most secure systems by targeting the people who use them. \n\nWe'll look at common social engineering techniques and how you can help protect your users and your organisation from these types of attacks.",
            "startsAt": "2016-08-27T11:35:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Tanya Janca",
                "name": "Tanya Janca"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room 1",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T12:20:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "89201593-4e75-4321-a481-b76c491583e2",
            "title": "Identity in a modern world - OpenID Connect and OAuth2",
            "description": "Building your own identity system is hard and risky. In this session we'll look at how you can use modern standards like OpenID Connect and OAuth2 to handle identity and access control in your applications. \n\nWe'll look at the core concepts, the different flows, and how you can implement this in your own applications using existing tools and services.",
            "startsAt": "2016-08-27T12:25:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Dominick Baier",
                "name": "Dominick Baier"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room 1",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "lunch",
            "title": "Lunch",
            "description": null,
            "startsAt": "2016-08-27T12:50:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "ccbb469f-5406-48dc-8e70-d20a84dd2044",
            "title": "RoboCup Junior Australia Rescue Robots",
            "description": "RoboCup Junior is a project-oriented educational initiative that sponsors local, regional and international robotic events for young students. It is designed to introduce RoboCup to primary and secondary school children. The focus in the junior league is on education. RoboCup is an international effort whose purpose is to foster Artificial Intelligence (AI) and robotics research by providing a standard problem where a wide range of technologies can be integrated and examined. Created in a true cooperative spirit, the RoboCup Junior Educational Competition encompasses not only engineering and IT skills, but extends right across a school curriculum. RoboCup Junior also addresses social development by encouraging sportsmanship, sharing, teamwork, understanding of differences between individuals and nations, cooperation and organisational skills.\n\nThe competition is divided into Rescue, Dance and Soccer divisions and the Australian Open National competition will be held in Sydney on 16th to 18th September 2016. For more information see http://robocupjunior.org.au/.",
            "startsAt": "2016-08-27T12:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "All Saints College students",
                "name": "All Saints College students"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "ffc49099-c8d9-4262-9e00-82ea414dc083",
            "title": "Banish the boilerplate - using pipelines to go faster",
            "description": "0% boilerplate. 3% Javascript. 100% value. Dream? Impossible? Mad ramblings? \n\nIn this session we'll have a look at some patterns which allow us to concentrate on the code that we want to write, without getting bogged down by the boring stuff around the edges.  We'll then enhance them with some testing patterns  now that Rob and Matt have burned down the testing pyramid.\n\nWe'll introduce pipelines, see how they eliminate boilerplate, and see how they lend themselves to highly composable, rich test suites.\n\nBy the end of this session, every keystroke you write is almost guaranteed to enhance your end products.",
            "startsAt": "2016-08-27T13:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Graeme Foster",
                "name": "Graeme Foster"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room 1",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T14:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "1403740b-48d9-4674-9eed-e2af035831dc",
            "title": "Universal Windows: The Right Way",
            "description": "So you want to start a new Universal Windows app for Windows 10, IoT or maybe even HoloLens but you're not sure how to do things right. There's models to wire up, bindings to do, background tasks that don't let you inherit objects, dependencies on unique platforms to manage... it all very quickly becomes a mess. But it doesn't have to!\n\nIn this talk I'll go through the anatomy of a well-designed basic Universal Windows Platform (UWP) application with all the good things we all know and love: Convention based ViewModel Binding, DI, IoC, easy lifecycle management and separation of concerns.",
            "startsAt": "2016-08-27T14:35:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Ryan Preece",
                "name": "Ryan Preece"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room 1",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "afternoon-tea",
            "title": "Afternoon tea",
            "description": null,
            "startsAt": "2016-08-27T15:20:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "sponsor-announcements-and-prize-draw!!!",
            "title": "Sponsor announcements and PRIZE DRAW!!!",
            "description": null,
            "startsAt": "2016-08-27T15:35:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "82988c58-8d9c-4518-a4f7-94cf7739299d",
            "title": "The Force Awakens: Mastering Your Inner Developer",
            "description": "It takes effort and discipline to be a great developer, but how do you know what to focus on, what to pursue, what to say no to? And how do you fit it all into an already packed life of family, friends, discovery and ambition?\n\nGetting a grasp on key professional skills, such as time management, learning to say no, building a network and, most importantly, keeping an open mind is no simple task. This talk will provide guidance and share personal experiences on how to build up the life of your creation, rather than the life you have settled for. From managing 3 businesses, being an author and speaker, organising conferences, giving as much back to the community as possible as well as being a father and partner, there are gold nuggets aplenty in this talk. Be inspired to think beyond yourself.",
            "startsAt": "2016-08-27T16:10:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Lars Klint",
                "name": "Lars Klint"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "thank-yous-and-wrap-up",
            "title": "Thank yous and wrap up",
            "description": null,
            "startsAt": "2016-08-27T16:55:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "afterparty",
            "title": "Afterparty",
            "description": null,
            "startsAt": "2016-08-27T17:00:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          }
        ],
        "hasOnlyPlenumSessions": false
      },
      {
        "id": 2,
        "name": "Side Room 2",
        "sessions": [
          {
            "id": "registration",
            "title": "Registration",
            "description": null,
            "startsAt": "2016-08-27T08:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "welcome-and-housekeeping",
            "title": "Welcome and housekeeping",
            "description": null,
            "startsAt": "2016-08-27T09:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "c86a3b2b-0985-48b8-b86a-73d84a779ca2",
            "title": "Welcome to the world of Tomorrow!",
            "description": "The DDD community is growing and moving into areas and platforms that we could only dream of just a few years ago. Our industry is changing, our tools are changing and the things we are building are changing. \n\nIn this talk we'll have a look at where we've been, where we are and where we are going. We'll look at some of the things that are happening in the DDD community and some of the things that are happening in the wider industry. \n\nWelcome to the world of Tomorrow!",
            "startsAt": "2016-08-27T09:30:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Brendan Forster",
                "name": "Brendan Forster"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "morning-tea",
            "title": "Morning tea",
            "description": null,
            "startsAt": "2016-08-27T10:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "9729a834-45e3-4923-a86a-b78c491583e1",
            "title": "Angular 2 for the skeptical developer",
            "description": "Angular 2 is a complete rewrite of the popular Angular framework. In this session we'll look at why you'd want to use it, and why you might be skeptical. \n\nWe'll look at the core concepts, the new syntax, and how it compares to Angular 1 and other modern frameworks like React. We'll also look at how you can get started with it today.",
            "startsAt": "2016-08-27T10:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Todd Motto",
                "name": "Todd Motto"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "Side Room 2",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T11:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "a8293455-89f4-4458-94f4-63854a889ce3",
            "title": "Azure Functions - Serverless computing in the cloud",
            "description": "Serverless computing is all the rage, and Azure Functions is Microsoft's answer. In this session we'll look at what Azure Functions are, how they work, and how you can use them to build scalable and cost-effective applications. \n\nWe'll look at the different triggers and bindings available, and see how you can write functions in a variety of languages including C#, F#, and JavaScript.",
            "startsAt": "2016-08-27T11:35:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Chris O'Dell",
                "name": "Chris O'Dell"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "Side Room 2",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T12:20:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "b78c4915-83e2-4e75-4321-a481-b76c491583e2",
            "title": "Real world React - lessons from the trenches",
            "description": "React is popular, but how does it hold up in a large-scale, long-running application? In this session we'll look at some of the lessons learned building and maintaining React applications in the real world. \n\nWe'll look at state management, component architecture, testing, and performance. We'll also look at some of the common pitfalls and how to avoid them.",
            "startsAt": "2016-08-27T12:25:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Jake Ginnivan",
                "name": "Jake Ginnivan"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "Side Room 2",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "lunch",
            "title": "Lunch",
            "description": null,
            "startsAt": "2016-08-27T12:50:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "ccbb469f-5406-48dc-8e70-d20a84dd2044",
            "title": "RoboCup Junior Australia Rescue Robots",
            "description": "RoboCup Junior is a project-oriented educational initiative that sponsors local, regional and international robotic events for young students. It is designed to introduce RoboCup to primary and secondary school children. The focus in the junior league is on education. RoboCup is an international effort whose purpose is to foster Artificial Intelligence (AI) and robotics research by providing a standard problem where a wide range of technologies can be integrated and examined. Created in a true cooperative spirit, the RoboCup Junior Educational Competition encompasses not only engineering and IT skills, but extends right across a school curriculum. RoboCup Junior also addresses social development by encouraging sportsmanship, sharing, teamwork, understanding of differences between individuals and nations, cooperation and organisational skills.\n\nThe competition is divided into Rescue, Dance and Soccer divisions and the Australian Open National competition will be held in Sydney on 16th to 18th September 2016. For more information see http://robocupjunior.org.au/.",
            "startsAt": "2016-08-27T12:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "All Saints College students",
                "name": "All Saints College students"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "8c3f3aaa-02a1-45ed-81f3-91233575c687",
            "title": "Low Latency designs from London Finance",
            "description": "Recently returning from London, where I was exposed to a world of low latency high throughput systems, I share my experiences and misconceptions. In this talk we talk discover how to measure latency, how single threaded can be the go-to design for speed and how to make Managed Memory systems (.NET/Java) perform like native systems. We also investigate the things that can be holding you back.\n\nThere will be code!",
            "startsAt": "2016-08-27T13:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Lee Campbell",
                "name": "Lee Campbell"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "Side Room 2",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "changeover",
            "title": "Changeover",
            "description": null,
            "startsAt": "2016-08-27T14:30:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "174d8338-0201-4711-b1f7-f3a0cca60d29",
            "title": "Brendan and Cristian Unplugged",
            "description": "It’s not every day you propose a session that’s deliberately unplanned, but here we are. \n\nCristian and Brendan have spent way too much time talking about random things and trying to solve the world's problems over beers, so why not do this in front of an audience? No promises that the organisers will let us have beer though… \n\nThose in the audience will have a chance to propose topics they want to hear us talk about (and we will disregard boring topics), and then who knows where things will go? Technical, non-technical, off-topic, whatever - bring whatever’s on your mind and we’ll have some fun.",
            "startsAt": "2016-08-27T14:35:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Brendan Forster",
                "name": "Brendan Forster"
              },
              {
                "id": "Cristian Prieto",
                "name": "Cristian Prieto"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "Side Room 2",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "afternoon-tea",
            "title": "Afternoon tea",
            "description": null,
            "startsAt": "2016-08-27T15:20:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "sponsor-announcements-and-prize-draw!!!",
            "title": "Sponsor announcements and PRIZE DRAW!!!",
            "description": null,
            "startsAt": "2016-08-27T15:35:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "82988c58-8d9c-4518-a4f7-94cf7739299d",
            "title": "The Force Awakens: Mastering Your Inner Developer",
            "description": "It takes effort and discipline to be a great developer, but how do you know what to focus on, what to pursue, what to say no to? And how do you fit it all into an already packed life of family, friends, discovery and ambition?\n\nGetting a grasp on key professional skills, such as time management, learning to say no, building a network and, most importantly, keeping an open mind is no simple task. This talk will provide guidance and share personal experiences on how to build up the life of your creation, rather than the life you have settled for. From managing 3 businesses, being an author and speaker, organising conferences, giving as much back to the community as possible as well as being a father and partner, there are gold nuggets aplenty in this talk. Be inspired to think beyond yourself.",
            "startsAt": "2016-08-27T16:10:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Lars Klint",
                "name": "Lars Klint"
              }
            ],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "thank-yous-and-wrap-up",
            "title": "Thank yous and wrap up",
            "description": null,
            "startsAt": "2016-08-27T16:55:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "afterparty",
            "title": "Afterparty",
            "description": null,
            "startsAt": "2016-08-27T17:00:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": true,
            "speakers": [],
            "categories": [],
            "roomId": null,
            "room": null,
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          }
        ],
        "hasOnlyPlenumSessions": false
      }
    ],
    "timeSlots": [
      {
        "slotStart": "2016-08-27T08:30:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "registration",
              "title": "Registration",
              "description": null,
              "startsAt": "2016-08-27T08:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "registration",
              "title": "Registration",
              "description": null,
              "startsAt": "2016-08-27T08:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "registration",
              "title": "Registration",
              "description": null,
              "startsAt": "2016-08-27T08:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T09:15:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "welcome-and-housekeeping",
              "title": "Welcome and housekeeping",
              "description": null,
              "startsAt": "2016-08-27T09:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "welcome-and-housekeeping",
              "title": "Welcome and housekeeping",
              "description": null,
              "startsAt": "2016-08-27T09:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "welcome-and-housekeeping",
              "title": "Welcome and housekeeping",
              "description": null,
              "startsAt": "2016-08-27T09:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T09:30:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "c86a3b2b-0985-48b8-b86a-73d84a779ca2",
              "title": "Welcome to the world of Tomorrow!",
              "description": "The DDD community is growing and moving into areas and platforms that we could only dream of just a few years ago. Our industry is changing, our tools are changing and the things we are building are changing. \n\nIn this talk we'll have a look at where we've been, where we are and where we are going. We'll look at some of the things that are happening in the DDD community and some of the things that are happening in the wider industry. \n\nWelcome to the world of Tomorrow!",
              "startsAt": "2016-08-27T09:30:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Brendan Forster",
                  "name": "Brendan Forster"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "c86a3b2b-0985-48b8-b86a-73d84a779ca2",
              "title": "Welcome to the world of Tomorrow!",
              "description": "The DDD community is growing and moving into areas and platforms that we could only dream of just a few years ago. Our industry is changing, our tools are changing and the things we are building are changing. \n\nIn this talk we'll have a look at where we've been, where we are and where we are going. We'll look at some of the things that are happening in the DDD community and some of the things that are happening in the wider industry. \n\nWelcome to the world of Tomorrow!",
              "startsAt": "2016-08-27T09:30:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Brendan Forster",
                  "name": "Brendan Forster"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "c86a3b2b-0985-48b8-b86a-73d84a779ca2",
              "title": "Welcome to the world of Tomorrow!",
              "description": "The DDD community is growing and moving into areas and platforms that we could only dream of just a few years ago. Our industry is changing, our tools are changing and the things we are building are changing. \n\nIn this talk we'll have a look at where we've been, where we are and where we are going. We'll look at some of the things that are happening in the DDD community and some of the things that are happening in the wider industry. \n\nWelcome to the world of Tomorrow!",
              "startsAt": "2016-08-27T09:30:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Brendan Forster",
                  "name": "Brendan Forster"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T10:15:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "morning-tea",
              "title": "Morning tea",
              "description": null,
              "startsAt": "2016-08-27T10:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "morning-tea",
              "title": "Morning tea",
              "description": null,
              "startsAt": "2016-08-27T10:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "morning-tea",
              "title": "Morning tea",
              "description": null,
              "startsAt": "2016-08-27T10:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T10:45:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "e8690859-99f5-4f96-80f4-5369c76251ef",
              "title": "Wait, I didn't mean to do that!",
              "description": "When you have a highly collaborative application, with many different people changing the same data, how can we help people feel safe? What does it take to create a world where a user can make an error, say \"oops!\" and go back to safety?\n\nJoin us as we take a high level look at why you shouldn't use CRUD, and why you should use a task-based UI. We'll explore the conceptual differences between 'Undo' and 'Cancel', and even touch on Event Sourcing.",
              "startsAt": "2016-08-27T10:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Matt Davies and Rob Crowley",
                  "name": "Matt Davies and Rob Crowley"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "Main Room",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "e8418f77-9875-43ea-9123-a86a489146e2",
              "title": "CSS for developers who hate CSS",
              "description": "Do you find yourself fighting with CSS? Do you find yourself adding !important to everything? Do you find yourself wondering why your styles aren't being applied? \n\nIn this session we'll look at some of the core concepts of CSS that often trip up developers. We'll look at the cascade, specificity, and the box model. We'll also look at some modern CSS techniques that make styling your applications a lot easier and more predictable.",
              "startsAt": "2016-08-27T10:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Justin King",
                  "name": "Justin King"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room 1",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "9729a834-45e3-4923-a86a-b78c491583e1",
              "title": "Angular 2 for the skeptical developer",
              "description": "Angular 2 is a complete rewrite of the popular Angular framework. In this session we'll look at why you'd want to use it, and why you might be skeptical. \n\nWe'll look at the core concepts, the new syntax, and how it compares to Angular 1 and other modern frameworks like React. We'll also look at how you can get started with it today.",
              "startsAt": "2016-08-27T10:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Todd Motto",
                  "name": "Todd Motto"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "Side Room 2",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T11:30:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T11:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T11:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T11:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T11:35:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "186a3455-89f4-4458-94f4-63854a889ce3",
              "title": "Azure DocumentDB - Beyond the buzzwords",
              "description": "Join us as we look at Microsoft's newest first-class database citizen, Azure DocumentDB. We'll look at the core concepts of DocumentDB including how it handles JSON, how it provides planetary scale and how it provides extremely high throughput.\n\nMore importantly, we'll dive deeper and look at the areas where it is different to other NoSQL stores, and where that makes it better or worse. We'll look at partitioning, indexes and server-side logic in the form of stored procedures, triggers and UDFs (all written in JavaScript).",
              "startsAt": "2016-08-27T11:35:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Simon Waight",
                  "name": "Simon Waight"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "Main Room",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "67290159-45e3-4923-a123-b78c4a9143e1",
              "title": "Hacking the human - why security is more than just code",
              "description": "We spend a lot of time thinking about how to make our code secure, but what about the people who use our systems? In this session we'll look at social engineering and how attackers can bypass even the most secure systems by targeting the people who use them. \n\nWe'll look at common social engineering techniques and how you can help protect your users and your organisation from these types of attacks.",
              "startsAt": "2016-08-27T11:35:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Tanya Janca",
                  "name": "Tanya Janca"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room 1",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "a8293455-89f4-4458-94f4-63854a889ce3",
              "title": "Azure Functions - Serverless computing in the cloud",
              "description": "Serverless computing is all the rage, and Azure Functions is Microsoft's answer. In this session we'll look at what Azure Functions are, how they work, and how you can use them to build scalable and cost-effective applications. \n\nWe'll look at the different triggers and bindings available, and see how you can write functions in a variety of languages including C#, F#, and JavaScript.",
              "startsAt": "2016-08-27T11:35:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Chris O'Dell",
                  "name": "Chris O'Dell"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "Side Room 2",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T12:20:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T12:20:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T12:20:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T12:20:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T12:25:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "90e0e047-8975-43ea-938f-a9657f864e29",
              "title": "Microservices... why would I even?",
              "description": "Wait, don't leave! This is NOT another talk about why microservices are the new panacea that will fix all your problems, give you clear skin and help you find love. This is a talk about the hard stuff. \n\nWhat are the actual reasons you'd want to build a system with microservices? What are the actual trade-offs? What does your team and your culture need to look like? We'll explore some of the lessons learned (some the hard way) building and running systems with microservices, and why you might just want to stick with a monolith after all.",
              "startsAt": "2016-08-27T12:25:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Joseph Cooney",
                  "name": "Joseph Cooney"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "Main Room",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "89201593-4e75-4321-a481-b76c491583e2",
              "title": "Identity in a modern world - OpenID Connect and OAuth2",
              "description": "Building your own identity system is hard and risky. In this session we'll look at how you can use modern standards like OpenID Connect and OAuth2 to handle identity and access control in your applications. \n\nWe'll look at the core concepts, the different flows, and how you can implement this in your own applications using existing tools and services.",
              "startsAt": "2016-08-27T12:25:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Dominick Baier",
                  "name": "Dominick Baier"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room 1",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "b78c4915-83e2-4e75-4321-a481-b76c491583e2",
              "title": "Real world React - lessons from the trenches",
              "description": "React is popular, but how does it hold up in a large-scale, long-running application? In this session we'll look at some of the lessons learned building and maintaining React applications in the real world. \n\nWe'll look at state management, component architecture, testing, and performance. We'll also look at some of the common pitfalls and how to avoid them.",
              "startsAt": "2016-08-27T12:25:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Jake Ginnivan",
                  "name": "Jake Ginnivan"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "Side Room 2",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T12:50:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "lunch",
              "title": "Lunch",
              "description": null,
              "startsAt": "2016-08-27T12:50:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "lunch",
              "title": "Lunch",
              "description": null,
              "startsAt": "2016-08-27T12:50:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "lunch",
              "title": "Lunch",
              "description": null,
              "startsAt": "2016-08-27T12:50:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T12:45:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "ccbb469f-5406-48dc-8e70-d20a84dd2044",
              "title": "RoboCup Junior Australia Rescue Robots",
              "description": "RoboCup Junior is a project-oriented educational initiative that sponsors local, regional and international robotic events for young students. It is designed to introduce RoboCup to primary and secondary school children. The focus in the junior league is on education. RoboCup is an international effort whose purpose is to foster Artificial Intelligence (AI) and robotics research by providing a standard problem where a wide range of technologies can be integrated and examined. Created in a true cooperative spirit, the RoboCup Junior Educational Competition encompasses not only engineering and IT skills, but extends right across a school curriculum. RoboCup Junior also addresses social development by encouraging sportsmanship, sharing, teamwork, understanding of differences between individuals and nations, cooperation and organisational skills.\n\nThe competition is divided into Rescue, Dance and Soccer divisions and the Australian Open National competition will be held in Sydney on 16th to 18th September 2016. For more information see http://robocupjunior.org.au/.",
              "startsAt": "2016-08-27T12:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "All Saints College students",
                  "name": "All Saints College students"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "ccbb469f-5406-48dc-8e70-d20a84dd2044",
              "title": "RoboCup Junior Australia Rescue Robots",
              "description": "RoboCup Junior is a project-oriented educational initiative that sponsors local, regional and international robotic events for young students. It is designed to introduce RoboCup to primary and secondary school children. The focus in the junior league is on education. RoboCup is an international effort whose purpose is to foster Artificial Intelligence (AI) and robotics research by providing a standard problem where a wide range of technologies can be integrated and examined. Created in a true cooperative spirit, the RoboCup Junior Educational Competition encompasses not only engineering and IT skills, but extends right across a school curriculum. RoboCup Junior also addresses social development by encouraging sportsmanship, sharing, teamwork, understanding of differences between individuals and nations, cooperation and organisational skills.\n\nThe competition is divided into Rescue, Dance and Soccer divisions and the Australian Open National competition will be held in Sydney on 16th to 18th September 2016. For more information see http://robocupjunior.org.au/.",
              "startsAt": "2016-08-27T12:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "All Saints College students",
                  "name": "All Saints College students"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "ccbb469f-5406-48dc-8e70-d20a84dd2044",
              "title": "RoboCup Junior Australia Rescue Robots",
              "description": "RoboCup Junior is a project-oriented educational initiative that sponsors local, regional and international robotic events for young students. It is designed to introduce RoboCup to primary and secondary school children. The focus in the junior league is on education. RoboCup is an international effort whose purpose is to foster Artificial Intelligence (AI) and robotics research by providing a standard problem where a wide range of technologies can be integrated and examined. Created in a true cooperative spirit, the RoboCup Junior Educational Competition encompasses not only engineering and IT skills, but extends right across a school curriculum. RoboCup Junior also addresses social development by encouraging sportsmanship, sharing, teamwork, understanding of differences between individuals and nations, cooperation and organisational skills.\n\nThe competition is divided into Rescue, Dance and Soccer divisions and the Australian Open National competition will be held in Sydney on 16th to 18th September 2016. For more information see http://robocupjunior.org.au/.",
              "startsAt": "2016-08-27T12:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "All Saints College students",
                  "name": "All Saints College students"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T13:45:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "477cabb8-4ca8-4f72-8e64-1cd11f6b2602",
              "title": "CQRS and Event Sourcing For The Win!",
              "description": "Command Query Responsibility Segregation (CQRS) is an important architectural pattern for enterprise applications.  It offers a number of important benefits for more complex and collaborative applications. This presentation will give a quick introduction to and overview of CQRS within a Domain Driven Design (DDD) context.  CQRS applications can also benefit from the use of Event Sourcing (ES). This presentation will give an introduction to and overview of CQRS using Event Sourcing.\n\nHowever, the second part of the presentation will be an investigation of whether events are the ultimate and most timeless way to persist application state (without actually persisting application state). The ability to construct and reconstruct data stores on the read-side enables post-hoc optimisations of data representation for queries. The ability to change paradigms on the application write-side means that the data representation is perhaps even more powerful and timeless than relational stores.",
              "startsAt": "2016-08-27T13:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Ashley Aitken",
                  "name": "Ashley Aitken"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "Main Room",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "ffc49099-c8d9-4262-9e00-82ea414dc083",
              "title": "Banish the boilerplate - using pipelines to go faster",
              "description": "0% boilerplate. 3% Javascript. 100% value. Dream? Impossible? Mad ramblings? \n\nIn this session we'll have a look at some patterns which allow us to concentrate on the code that we want to write, without getting bogged down by the boring stuff around the edges.  We'll then enhance them with some testing patterns  now that Rob and Matt have burned down the testing pyramid.\n\nWe'll introduce pipelines, see how they eliminate boilerplate, and see how they lend themselves to highly composable, rich test suites.\n\nBy the end of this session, every keystroke you write is almost guaranteed to enhance your end products.",
              "startsAt": "2016-08-27T13:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Graeme Foster",
                  "name": "Graeme Foster"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room 1",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "8c3f3aaa-02a1-45ed-81f3-91233575c687",
              "title": "Low Latency designs from London Finance",
              "description": "Recently returning from London, where I was exposed to a world of low latency high throughput systems, I share my experiences and misconceptions. In this talk we talk discover how to measure latency, how single threaded can be the go-to design for speed and how to make Managed Memory systems (.NET/Java) perform like native systems. We also investigate the things that can be holding you back.\n\nThere will be code!",
              "startsAt": "2016-08-27T13:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Lee Campbell",
                  "name": "Lee Campbell"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "Side Room 2",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T14:30:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T14:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T14:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2016-08-27T14:30:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T14:35:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "24a69d28-172d-4e77-90d3-190e221b7c60",
              "title": "Random Failures of Architecture I Have Committed",
              "description": "Everyone loves to talk themselves up in conference presentations, regaling you with tales of their technical brilliance. Sure these talks can be filled with valuable information about the latest technologies, but have you ever stopped to consider how it makes you, the audience, feel? After you've spent the weekend hearing about reactively programmed event sourced games running in the cloud isn't hard to go back to writing CRUD forms using ASP.NET WebForms 3.5 against an Access DB? Don't you want someone to stand up and tell you all the ways they've screwed up so you can feel better about the code that awaits you on Monday? \n\nThis is that talk. \n\nIt's taken Colin 17 years to learn these things through failures big and small. Now you can learn such classic mistakes as inappropriate layering, leaky abstractions, reimplementing perfectly valid frameworks because reasons, undervaluing the cost of development friction, and so much more. All this (probably, maybe) in just one session the length of which I did not bother to research. Yours to take away so you can laugh smugly at me when you fail to do so in your career*. Vote now but don't send any money. \n\n*offer void where prohibited",
              "startsAt": "2016-08-27T14:35:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Colin Scott",
                  "name": "Colin Scott"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "Main Room",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "1403740b-48d9-4674-9eed-e2af035831dc",
              "title": "Universal Windows: The Right Way",
              "description": "So you want to start a new Universal Windows app for Windows 10, IoT or maybe even HoloLens but you're not sure how to do things right. There's models to wire up, bindings to do, background tasks that don't let you inherit objects, dependencies on unique platforms to manage... it all very quickly becomes a mess. But it doesn't have to!\n\nIn this talk I'll go through the anatomy of a well-designed basic Universal Windows Platform (UWP) application with all the good things we all know and love: Convention based ViewModel Binding, DI, IoC, easy lifecycle management and separation of concerns.",
              "startsAt": "2016-08-27T14:35:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Ryan Preece",
                  "name": "Ryan Preece"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room 1",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "174d8338-0201-4711-b1f7-f3a0cca60d29",
              "title": "Brendan and Cristian Unplugged",
              "description": "It’s not every day you propose a session that’s deliberately unplanned, but here we are. \n\nCristian and Brendan have spent way too much time talking about random things and trying to solve the world's problems over beers, so why not do this in front of an audience? No promises that the organisers will let us have beer though… \n\nThose in the audience will have a chance to propose topics they want to hear us talk about (and we will disregard boring topics), and then who knows where things will go? Technical, non-technical, off-topic, whatever - bring whatever’s on your mind and we’ll have some fun.",
              "startsAt": "2016-08-27T14:35:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Brendan Forster",
                  "name": "Brendan Forster"
                },
                {
                  "id": "Cristian Prieto",
                  "name": "Cristian Prieto"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "Side Room 2",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T15:20:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "afternoon-tea",
              "title": "Afternoon tea",
              "description": null,
              "startsAt": "2016-08-27T15:20:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "afternoon-tea",
              "title": "Afternoon tea",
              "description": null,
              "startsAt": "2016-08-27T15:20:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "afternoon-tea",
              "title": "Afternoon tea",
              "description": null,
              "startsAt": "2016-08-27T15:20:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T15:35:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "sponsor-announcements-and-prize-draw!!!",
              "title": "Sponsor announcements and PRIZE DRAW!!!",
              "description": null,
              "startsAt": "2016-08-27T15:35:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "sponsor-announcements-and-prize-draw!!!",
              "title": "Sponsor announcements and PRIZE DRAW!!!",
              "description": null,
              "startsAt": "2016-08-27T15:35:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "sponsor-announcements-and-prize-draw!!!",
              "title": "Sponsor announcements and PRIZE DRAW!!!",
              "description": null,
              "startsAt": "2016-08-27T15:35:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T16:10:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "82988c58-8d9c-4518-a4f7-94cf7739299d",
              "title": "The Force Awakens: Mastering Your Inner Developer",
              "description": "It takes effort and discipline to be a great developer, but how do you know what to focus on, what to pursue, what to say no to? And how do you fit it all into an already packed life of family, friends, discovery and ambition?\n\nGetting a grasp on key professional skills, such as time management, learning to say no, building a network and, most importantly, keeping an open mind is no simple task. This talk will provide guidance and share personal experiences on how to build up the life of your creation, rather than the life you have settled for. From managing 3 businesses, being an author and speaker, organising conferences, giving as much back to the community as possible as well as being a father and partner, there are gold nuggets aplenty in this talk. Be inspired to think beyond yourself.",
              "startsAt": "2016-08-27T16:10:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Lars Klint",
                  "name": "Lars Klint"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "82988c58-8d9c-4518-a4f7-94cf7739299d",
              "title": "The Force Awakens: Mastering Your Inner Developer",
              "description": "It takes effort and discipline to be a great developer, but how do you know what to focus on, what to pursue, what to say no to? And how do you fit it all into an already packed life of family, friends, discovery and ambition?\n\nGetting a grasp on key professional skills, such as time management, learning to say no, building a network and, most importantly, keeping an open mind is no simple task. This talk will provide guidance and share personal experiences on how to build up the life of your creation, rather than the life you have settled for. From managing 3 businesses, being an author and speaker, organising conferences, giving as much back to the community as possible as well as being a father and partner, there are gold nuggets aplenty in this talk. Be inspired to think beyond yourself.",
              "startsAt": "2016-08-27T16:10:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Lars Klint",
                  "name": "Lars Klint"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "82988c58-8d9c-4518-a4f7-94cf7739299d",
              "title": "The Force Awakens: Mastering Your Inner Developer",
              "description": "It takes effort and discipline to be a great developer, but how do you know what to focus on, what to pursue, what to say no to? And how do you fit it all into an already packed life of family, friends, discovery and ambition?\n\nGetting a grasp on key professional skills, such as time management, learning to say no, building a network and, most importantly, keeping an open mind is no simple task. This talk will provide guidance and share personal experiences on how to build up the life of your creation, rather than the life you have settled for. From managing 3 businesses, being an author and speaker, organising conferences, giving as much back to the community as possible as well as being a father and partner, there are gold nuggets aplenty in this talk. Be inspired to think beyond yourself.",
              "startsAt": "2016-08-27T16:10:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Lars Klint",
                  "name": "Lars Klint"
                }
              ],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T16:55:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "thank-yous-and-wrap-up",
              "title": "Thank yous and wrap up",
              "description": null,
              "startsAt": "2016-08-27T16:55:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "thank-yous-and-wrap-up",
              "title": "Thank yous and wrap up",
              "description": null,
              "startsAt": "2016-08-27T16:55:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "thank-yous-and-wrap-up",
              "title": "Thank yous and wrap up",
              "description": null,
              "startsAt": "2016-08-27T16:55:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      },
      {
        "slotStart": "2016-08-27T17:00:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "afterparty",
              "title": "Afterparty",
              "description": null,
              "startsAt": "2016-08-27T17:00:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "Side Room 1",
            "index": 1,
            "session": {
              "id": "afterparty",
              "title": "Afterparty",
              "description": null,
              "startsAt": "2016-08-27T17:00:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "Side Room 2",
            "index": 2,
            "session": {
              "id": "afterparty",
              "title": "Afterparty",
              "description": null,
              "startsAt": "2016-08-27T17:00:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": true,
              "speakers": [],
              "categories": [],
              "roomId": null,
              "room": null,
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          }
        ]
      }
    ]
  }
],
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    ticketInfo: undefined,

    sponsors: {
        gold: [
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/static/images/sponsors/bankwest.png',
                logoUrlLightMode: '/static/images/sponsors/bankwest.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
            {
                name: 'Readify',
                logoUrlDarkMode: '/static/images/sponsors/readify.png',
                logoUrlLightMode: '/static/images/sponsors/readify.png',
                website: 'https://readify.net/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/static/images/sponsors/microsoft.png',
                logoUrlLightMode: '/static/images/sponsors/microsoft.png',
                website: 'https://www.microsoft.com/en-au',
                quote: undefined,
            },
        ],
    },
}
