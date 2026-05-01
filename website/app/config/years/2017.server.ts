import { DateTime } from 'luxon'
import type { ConferenceYear } from '../../lib/config-types.server'
import { pcecVenue } from '../venues/pcec'

export const conference2017: ConferenceYear = {
    kind: 'conference',
    year: '2017',
    conferenceDate: DateTime.fromISO('2017-09-16T08:00:00', { zone: 'Australia/Perth' }),
    sessionizeUrl: undefined,

    venue: pcecVenue,
    sessions: {
        kind: 'session-data',
        sessions: [
  {
    "date": "2017-09-16T00:00:00",
    "isDefault": true,
    "rooms": [
      {
        "id": 0,
        "name": "RR5",
        "sessions": [
          {
            "id": "registration",
            "title": "Registration",
            "description": null,
            "startsAt": "2017-09-16T08:00:00",
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
            "startsAt": "2017-09-16T08:45:00",
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
            "id": "44f64f98-53ef-4344-93f6-9d852f845ed2",
            "title": "Five key challenges for software quality tomorrow",
            "description": "With the advances in our industry we can build software faster and operate it cheaper while serving more platforms and solving more problems than ever before. This is not without it's complications though, this new landscape requires teams to change their approach to reduce risk and ensure quality in their software.\n\nIn this presentation, Gojko will look at five important software quality challenges facing delivery teams due to these shifting roles. He will also present some emerging ideas that will help address these challenges and inspire you to rethink your approach to testing.",
            "startsAt": "2017-09-16T09:00:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Gojko Adzic",
                "name": "Gojko Adzic"
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
            "startsAt": "2017-09-16T09:45:00",
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
            "id": "684b7f57-fd87-4963-a7a3-b77715287347",
            "title": "Death By Good Intentions",
            "description": "After spending time in over 25 different workplaces, I've seen examples of high-performing teams, and those that are totally stifled by their environment.\n\nI've spent time trying to distill what made each of those places tick and extracted common problems. For each of those problems, I use examples to explain their effect on the team, and the solutions I've seen work to mitigate them. We'll cover topics like security theatre, tech strategy and team setup amongst others. \n\nBy the end of it you'll come away with a few tools to take back to your organisation to help your teams get stuff done and hopefully make some customers happy along the way.",
            "startsAt": "2017-09-16T10:15:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Nathan Jones",
                "name": "Nathan Jones"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "RR5",
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
            "startsAt": "2017-09-16T11:00:00",
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
            "id": "6916c81d-28e4-4471-8368-26f4c80aea29",
            "title": "GraphQL - A query language to empower your API consumers",
            "description": "The API economy is here, fueling disruption across many established industries. REST, as specified in Roy Fielding’s seminal dissertation, has become the architectural pattern of choice for APIs and when applied correctly allows for clients and servers to evolve in a loosely coupled manner. There are areas however where REST can deliver less than ideal client experiences. Often many HTTP requests are required to render a single view.\n\nWhile this may be a minor concern for a web app running on a WAN with low latency and high bandwidth, it can yield poor client experiences for mobile clients in particular. GraphQL is Facebook’s response to this challenge and it is quickly proving itself as an exciting alternative to RESTful APIs for a wide range of contexts. GraphQL is a query language that provides a clean and simple syntax for consumers to interrogate your APIs. These queries are strongly typed, hierarchical and enable clients to retrieve only the data they need.\n\nIn this session, we will take a hands-on look at GraphQL and see how it can be used to build APIs that are a joy to use.",
            "startsAt": "2017-09-16T11:05:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Rob Crowley",
                "name": "Rob Crowley"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "RR5",
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
            "startsAt": "2017-09-16T11:50:00",
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
            "id": "6742a7ad-0e47-4704-86d0-22b038afe2c4",
            "title": "Mobile App Test Automation: Let's look into the future",
            "description": "In the present world, mobile applications are growing exponentially. A large number of businesses & enterprises, ranging from large corporations to start-ups, are increasing their spending on mobile app development to create an awesome customer experience & an emotional attachment with their end users. The increasing popularity of the mobile applications has surfaced a few very imminent issues, mostly related to determining the quality of these mobile applications.\n\nMobile applications typically work with limited resources; hence the resource usage needs to be monitored continuously to avoid performance issues. More conventional functional testing approaches, like user interface testing, usability testing & integration testing with underlying application programming interface, need to be employed in addition to compatibility testing and performance testing for exhaustively testing a mobile application across multiple platforms (iOS, Android, Windows). On top of that, confidential data like phone contacts, banking and other personal information, global GPS position could be disclosed by vulnerable applications & unreliable mobile networks, so sensitive applications require validating exchanged data to avoid security issues over various available mobile networks. Other factors we need to consider while testing would be user experience, testing the interruptions caused by incoming calls or text messages while the application under test is on foreground and battery. \n\n\nThis presentation outlines the mobile test automation challenges from the perspectives of user interface design, product function, performance & security. Furthermore, we also focus on some of the gaps that exist in present day mobile app automation testing & propose some future work to enhance the existing testing frameworks.",
            "startsAt": "2017-09-16T11:55:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Subrata Bhattacharjee",
                "name": "Subrata Bhattacharjee"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "RR5",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "8c7a2d53-bc00-436f-9150-3f7db76b3610",
            "title": "Web, Wellness and Getting Sh*t Done",
            "description": "In an industry that doesn't sleep and where there's probably something new to learn or try released by the time you’ve finished reading this paragraph, it’s no wonder we get overwhelmed and sometimes lose focus.\n\nThere's a lot to be said about pressing pause, resetting and unfolding that roadmap often to see if you’re still going in the right direction. \n\nBeing a brilliant dev is great, but being a brilliant dev who understands balance, how to manage time, how to focus and be aware of when to put the foot down on the pedal or that you might need to pull over for a nap… well, this person becomes a super dev.",
            "startsAt": "2017-09-16T12:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Patima Tantiprasut",
                "name": "Patima Tantiprasut"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "RR5",
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
            "startsAt": "2017-09-16T12:40:00",
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
            "id": "286930b8-ab3d-4a33-9b3a-ba863032aa1d",
            "title": "Congrats, You are a Solution Architect, now what?",
            "description": "Ok so you have been made a tech lead/architect and you have been tasked to build an elegant, performant, scalable, cloud application. What would you do? There are a lot of decisions that you are going to make and you are accountable for these. Things like what cloud provider to choose? What data storage you choose? What compute unit to choose? How to secure it? How to protect it? How to communicate the design well to the devs to implement it? What messaging components to use? How to verify you design against functional and non functional specs? And the list goes on and on\nI have been lucky enough to be involved and leading some of the great projects in my career and I was there from day 1 ( in some cases). I have had to make many of these decisions. Some of them were good and others turned out not too great.\nIn this talk, I will share with you my experience and the approach that I have developed. My process works for most project and it creates a good recipe for rinse and repeat. The talk would be full of demos to demo the impact of these decision.",
            "startsAt": "2017-09-16T13:40:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Has AlTaiar",
                "name": "Has AlTaiar"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "RR5",
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
            "startsAt": "2017-09-16T14:25:00",
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
            "id": "36bc7011-11a7-4c33-bb84-e0e49da88b39",
            "title": "Web Accessibility: Responsibilities, Laws and Policies, Australian Requirements",
            "description": "Learn the approach followed in Australia related to the requirements for digital accessibility.  It certainly won't be boring or technical, but will provide you with the knowledge you need to address the requirements and persuade those within your organisation that this is not just a 'good thing to do', but the 'smart thing to do', the 'right thing to do' and is 'good for business' at the same time!\n\nIn this session, we will explore the Australian context of web accessibility including the new Australian Standard for procurement of ICT products (AS 301549), the W3C's new release of Web Accessibility Laws and Policies which show the Australian setting, the procedures followed by the Australian Human Rights Commission in administering the Disability Discrimination Act and other related materials.\n\nCome along and get informed!",
            "startsAt": "2017-09-16T14:30:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Dr Vivienne Conway",
                "name": "Dr Vivienne Conway"
              }
            ],
            "categories": [],
            "roomId": 0,
            "room": "RR5",
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
            "startsAt": "2017-09-16T15:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": false,
            "speakers": [],
            "categories": [],
            "roomId": 0,
            "room": "RR5",
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
            "startsAt": "2017-09-16T15:45:00",
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
            "id": "d06d45de-de42-44da-83eb-ea1d9d14b6cc",
            "title": "The Campsite Rule - Leaving the Tech Industry Better than We Found It",
            "description": "Improving the codebase for the next developer is a great goal, but what about making the industry better for the next generation? In this talk, Kris will debunk some of the damaging myths and ideas we’re all guilty of perpetuating, the ones that lead to stress and burnout. Fortunately there is an antidote - becoming a mentor! You’ll learn how you can change your own behaviour and thinking, be more supportive to those just starting out, and feel more engaged and inspired in your work - all with minimal effort. We all have a responsibility to make things just a little bit better for those who come after us.",
            "startsAt": "2017-09-16T16:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Kris Howard",
                "name": "Kris Howard"
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
            "startsAt": "2017-09-16T17:05:00",
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
            "startsAt": "2017-09-16T17:10:00",
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
        "name": "M6",
        "sessions": [
          {
            "id": "registration",
            "title": "Registration",
            "description": null,
            "startsAt": "2017-09-16T08:00:00",
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
            "startsAt": "2017-09-16T08:45:00",
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
            "id": "44f64f98-53ef-4344-93f6-9d852f845ed2",
            "title": "Five key challenges for software quality tomorrow",
            "description": "With the advances in our industry we can build software faster and operate it cheaper while serving more platforms and solving more problems than ever before. This is not without it's complications though, this new landscape requires teams to change their approach to reduce risk and ensure quality in their software.\n\nIn this presentation, Gojko will look at five important software quality challenges facing delivery teams due to these shifting roles. He will also present some emerging ideas that will help address these challenges and inspire you to rethink your approach to testing.",
            "startsAt": "2017-09-16T09:00:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Gojko Adzic",
                "name": "Gojko Adzic"
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
            "startsAt": "2017-09-16T09:45:00",
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
            "id": "2be131c5-155d-4207-8e24-910bf50a6894",
            "title": "Modern TypeScript is amazing!",
            "description": "You think you know TypeScript? Unless you have been looking at it recently you likely have missed some of the amazing features shipped in 2.0, 2.1 and 2.2. Some of these language features exist in very few other languages and open up so many doors.\n\nIn this talk we will introduce you to TypeScript and run through a number of the latest language features including spread/rest operators which many Babel users love, Mapped Types, Generics and cover practical examples where he has been using these features to improve the code he is writing day to day.",
            "startsAt": "2017-09-16T10:15:00",
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
            "roomId": 1,
            "room": "M6",
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
            "startsAt": "2017-09-16T11:00:00",
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
            "id": "74ad268f-38ad-4dc5-814a-f7a0437360d6",
            "title": "How feedback helped me get over myself",
            "description": "What happens when your view and opinions of yourself don’t match everyone else’s around you? People can start to think you’re conceited and pretentious. Feedback can help bridge that gap.\n \nThis is the story of a developer that wasn't used to being told the not-so-great things about them, and their journey in struggling and eventually embracing feedback (and getting over themselves).\n \nThis talk will take a look at feedback culture with a tongue-in-cheek storytelling and lessons learned approach. \n \nBy seeing the journey of someone who started with no exposure to feedback culture, you will learn what feedback can do for you and the impact it can have on your personal growth. You will also learn how to empower those around you with tips on how to give effective feedback.\n \nKey takeaways:\nWhat is feedback\nWhat is a feedback culture\nWhat are the benefits of feedback\nHow to ask for feedback\nHow to give effective feedback",
            "startsAt": "2017-09-16T11:05:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Jasmine Quek",
                "name": "Jasmine Quek"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "M6",
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
            "startsAt": "2017-09-16T11:50:00",
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
            "id": "20f26760-d2bf-400a-8a73-807502c11291",
            "title": "Pair Programming - Experience from the trenches",
            "description": "What are the some of the problems software delivery teams experience? Is there a way of working that will allow software delivery teams to overcome these problems?\n\nSoftware delivery teams face challenges with productivity, code quality, team health, and knowledge sharing and code ownership. There are many ways of working that allow a team to address these issues. The challenge is to find the right way of working that helps to address these issues quickly.\n\nIn this talk, you will learn how Pair Programming is one such way of working that will help address these challenges. You will learn the mechanics of Pair Programming, things to watch out for and tips to successfully set up a pair programming session.\n\nLearning outcomes:\nWhat is pair programming?\nWhat are the benefits of pair programming?\nWhat things to look out for?\nWhy some people find it hard?\nWhen not to pair program?",
            "startsAt": "2017-09-16T11:55:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Sameer Chauhan",
                "name": "Sameer Chauhan"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "M6",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "20f26760-d2bf-400a-8a73-807502c11291",
            "title": "Pair Programming - Experience from the trenches",
            "description": "What are the some of the problems software delivery teams experience? Is there a way of working that will allow software delivery teams to overcome these problems?\n\nSoftware delivery teams face challenges with productivity, code quality, team health, and knowledge sharing and code ownership. There are many ways of working that allow a team to address these issues. The challenge is to find the right way of working that helps to address these issues quickly.\n\nIn this talk, you will learn how Pair Programming is one such way of working that will help address these challenges. You will learn the mechanics of Pair Programming, things to watch out for and tips to successfully set up a pair programming session.\n\nLearning outcomes:\nWhat is pair programming?\nWhat are the benefits of pair programming?\nWhat things to look out for?\nWhy some people find it hard?\nWhen not to pair program?",
            "startsAt": "2017-09-16T12:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Sameer Chauhan",
                "name": "Sameer Chauhan"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "M6",
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
            "startsAt": "2017-09-16T12:40:00",
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
            "id": "3a75a53c-3cb1-41dc-ba5a-b74efc8546ac",
            "title": "Quantum Encryption - New Advances in Data Security",
            "description": "There are exciting advances being made in the way we securely transport data. At present there is a technological space race between the super power nations on who can crack this first. The implications are massive!\n\nIn this talk I will detail  how this new approach works, why data security is so important and what it could mean to us all in the future.\n\nWe will also have a fun looking back on existing data security methods of times gone by.",
            "startsAt": "2017-09-16T13:40:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Will Webster",
                "name": "Will Webster"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "M6",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "2c375902-fe42-4009-96ca-1206ab4447a9",
            "title": "Serverless architecture for small-scale projects",
            "description": "\"Serverless\" is one of the latest trending buzzwords in the industry.  Much of the hype about this architectural style is about the scalability and ease of infrastructure management for large-scale projects, with a lot of users, and big volumes of data.\n\nHowever, the serverless architecture is not solely concerned with the large-scale, and can be extremely cost-effective for small-scale projects.\n\nThis session explores some ways of using serverless architecture, tools and services for smaller projects with a limited budget, based on professional experience and successes utilising these technologies in various business domains, including citizen science, academic research, and government.",
            "startsAt": "2017-09-16T14:05:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Ben New",
                "name": "Ben New"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "M6",
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
            "startsAt": "2017-09-16T14:25:00",
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
            "id": "de3f62ca-fd85-43a0-865c-fd17102588bb",
            "title": "What a real sprint looks like",
            "description": "A lot of us have worked in \"agile\" teams that if we're being honest are about as agile as a rock, and a surprisingly high number of people in software really don't know what a successful agile process looks like.\n\nI want to show you a real world sprint from a mature Scrum team, exploring how they actually deliver, and how the Scrum meetings work in practice and why they're important.\n\nIf you've never seen a mature Scrum team in action before you'll get to see what a high performing one looks like, and if you're already agile you can compare and hopefully pick up some tips or share your own.",
            "startsAt": "2017-09-16T14:30:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Ian Hughes",
                "name": "Ian Hughes"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "M6",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "f14fe883-7570-4459-b71e-4f6165ff99b0",
            "title": "Speaker Panel",
            "description": "Join selected speakers during the afternoon tea break for an extended Q&A panel session. Ask more detailed questions on their topic, or ask the questions you didn’t get a chance to after their presentation.\n\nFormat will be an open Q&A session, so come with your coffee, grab a microphone and join in!",
            "startsAt": "2017-09-16T15:15:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Donna Edwards, Nathan Jones, Rami Ruhayel, Patima Tantiprasut",
                "name": "Donna Edwards, Nathan Jones, Rami Ruhayel, Patima Tantiprasut"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "M6",
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
            "startsAt": "2017-09-16T15:45:00",
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
            "id": "d06d45de-de42-44da-83eb-ea1d9d14b6cc",
            "title": "The Campsite Rule - Leaving the Tech Industry Better than We Found It",
            "description": "Improving the codebase for the next developer is a great goal, but what about making the industry better for the next generation? In this talk, Kris will debunk some of the damaging myths and ideas we’re all guilty of perpetuating, the ones that lead to stress and burnout. Fortunately there is an antidote - becoming a mentor! You’ll learn how you can change your own behaviour and thinking, be more supportive to those just starting out, and feel more engaged and inspired in your work - all with minimal effort. We all have a responsibility to make things just a little bit better for those who come after us.",
            "startsAt": "2017-09-16T16:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Kris Howard",
                "name": "Kris Howard"
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
            "startsAt": "2017-09-16T17:05:00",
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
            "startsAt": "2017-09-16T17:10:00",
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
        "name": "RR4",
        "sessions": [
          {
            "id": "registration",
            "title": "Registration",
            "description": null,
            "startsAt": "2017-09-16T08:00:00",
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
            "startsAt": "2017-09-16T08:45:00",
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
            "id": "44f64f98-53ef-4344-93f6-9d852f845ed2",
            "title": "Five key challenges for software quality tomorrow",
            "description": "With the advances in our industry we can build software faster and operate it cheaper while serving more platforms and solving more problems than ever before. This is not without it's complications though, this new landscape requires teams to change their approach to reduce risk and ensure quality in their software.\n\nIn this presentation, Gojko will look at five important software quality challenges facing delivery teams due to these shifting roles. He will also present some emerging ideas that will help address these challenges and inspire you to rethink your approach to testing.",
            "startsAt": "2017-09-16T09:00:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Gojko Adzic",
                "name": "Gojko Adzic"
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
            "startsAt": "2017-09-16T09:45:00",
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
            "id": "c09518f6-58a0-4cbc-84ba-87b862d6f514",
            "title": "Stop Mocking – start testing.",
            "description": "How much value do your automated tests really provide? I will demonstrate common and regular pitfalls in automated testing. Namely, that of mis-defining what a ‘unit’ is and disregard for integration tests. Among other things I will also demonstrate how stale tests – be they failing or passing are a problem as well.\n\nTesting is a good thing, testing a lot for the sake of it is NOT. Stop mocking and actually start testing to provide the highest amount of value in your application with the least amount of code.",
            "startsAt": "2017-09-16T10:15:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Raphael Haddad",
                "name": "Raphael Haddad"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
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
            "startsAt": "2017-09-16T11:00:00",
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
            "id": "d1bb10e3-c2af-4db7-93fc-dcbfe03d9b7b",
            "title": "Flying Solo - lifehack your way to a pants-optional workplace",
            "description": "Many developers harbour the dream of throwing off the shackles of corporate serfdom and experiencing the glorious freedom of self-employment. So is the grass really greener on the other side?\n\nAs a developer who took the plunge a few years ago, I can offer some honest feedback and practical advice on things like:\n* what to consider when assessing whether self-employment is right for you.\n* the different software development business models, the pros & cons of each.\n* setting up a business/company - which structure is best.\n* knowing when to quit your job.\n* pricing yourself correctly.\n* sales & marketing - critical activity or soul destroying waste of effort?\n* why on earth can’t people just pay you on time.\n* what to say to friends and relatives who think you don’t do anything all day.\n* generally everything else that I know now, that I wish I knew then.\n\nAttendees will either walk out with a solid plan of attack for starting their own business, or thankful they have a job and don’t have to deal with that rubbish.",
            "startsAt": "2017-09-16T11:05:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Sam Ritchie",
                "name": "Sam Ritchie"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
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
            "startsAt": "2017-09-16T11:50:00",
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
            "id": "7e482ec2-9657-40ea-a3dd-ba0c53f824c3",
            "title": "A (gentle) introduction to Neural Networks",
            "description": "As developers we’ve all heard a lot about Machine Learning, Big Data and I'm certain that most if not all of us would love to get involved in this exciting field. However the pressures of juggling the demands of a full-time career in software can make getting started in such a broad field feel a little daunting. I’d like to change that!\n\nWhat I’d like to cover in this talk are the fundamental concepts of Linear Regression. Next we’ll look at Gradient Descent, a simple, yet powerful technique we can use to find the ‘best fitting’ parameter values for our model. Next, a we’ll take a quick look at Logistic Regression and discuss the central tenant of any Neural Network, the Perceptron. With this understanding, we can jump into building and initializing a small Neural Network. The last piece of the puzzle is  how we train a Neural Network. We’ll discuss Back Propagation, an algorithm that retrospectively updates the weightings between nodes our Neural Network. With that knowledge in hand, we’ll have everything required to throw some unseen data at our  Neural Network and watch the magic unfold.  Last but not least, is a look at how Neural Networks can be used in practice. Whilst the solve many real life problems, from enabling an autonomous vehicle to navigate a busy highway to detecting fraudulent banking patterns, for the purposes of this talk I’ll be demonstrating how a neural network can be used to solve the age old problem of handwriting recognition.\n\nBy attending this talk attendees will walk away with a clear understanding of the deceptively simple techniques used to build the majority of the learning algorithms used in industry (Linear Regression, Gradient Descent). My goal is to motivate attendees to seek ongoing education in this space, and at the conclusion of the talk references will be provided to material that I’ve found invaluable in my personal journey, including a brief review of Coursera’s  Machine Learning MOOC.",
            "startsAt": "2017-09-16T11:55:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Rami Ruhayel",
                "name": "Rami Ruhayel"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "7e482ec2-9657-40ea-a3dd-ba0c53f824c3",
            "title": "A (gentle) introduction to Neural Networks",
            "description": "As developers we’ve all heard a lot about Machine Learning, Big Data and I'm certain that most if not all of us would love to get involved in this exciting field. However the pressures of juggling the demands of a full-time career in software can make getting started in such a broad field feel a little daunting. I’d like to change that!\n\nWhat I’d like to cover in this talk are the fundamental concepts of Linear Regression. Next we’ll look at Gradient Descent, a simple, yet powerful technique we can use to find the ‘best fitting’ parameter values for our model. Next, a we’ll take a quick look at Logistic Regression and discuss the central tenant of any Neural Network, the Perceptron. With this understanding, we can jump into building and initializing a small Neural Network. The last piece of the puzzle is  how we train a Neural Network. We’ll discuss Back Propagation, an algorithm that retrospectively updates the weightings between nodes our Neural Network. With that knowledge in hand, we’ll have everything required to throw some unseen data at our  Neural Network and watch the magic unfold.  Last but not least, is a look at how Neural Networks can be used in practice. Whilst the solve many real life problems, from enabling an autonomous vehicle to navigate a busy highway to detecting fraudulent banking patterns, for the purposes of this talk I’ll be demonstrating how a neural network can be used to solve the age old problem of handwriting recognition.\n\nBy attending this talk attendees will walk away with a clear understanding of the deceptively simple techniques used to build the majority of the learning algorithms used in industry (Linear Regression, Gradient Descent). My goal is to motivate attendees to seek ongoing education in this space, and at the conclusion of the talk references will be provided to material that I’ve found invaluable in my personal journey, including a brief review of Coursera’s  Machine Learning MOOC.",
            "startsAt": "2017-09-16T12:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Rami Ruhayel",
                "name": "Rami Ruhayel"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
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
            "startsAt": "2017-09-16T12:40:00",
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
            "id": "83ce0668-9d21-41bb-802a-50a810abfa9a",
            "title": "Attraction and retention strategies for Women in tech",
            "description": "Women make up 31% of the Australian IT workforce with only 14% in leadership roles; this is a statistic we can and should improve. \n\nResearch shows that organisations with equal gender in leadership roles perform better and employee satisfaction of both men and women are higher. Most organisations have goals and are trying to improve these statistics but its proving to be a big challenge.\n\nSo get your notepad ready because I will give you some practical tips on how and where to attract more females to your organisation along with the insider tools to help retain and develop them.\n\nYou don’t need to be a manager to make a difference and help create a successful gender balanced organisation.",
            "startsAt": "2017-09-16T13:40:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Donna Edwards",
                "name": "Donna Edwards"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "83ce0668-9d21-41bb-802a-50a810abfa9a",
            "title": "Attraction and retention strategies for Women in tech",
            "description": "Women make up 31% of the Australian IT workforce with only 14% in leadership roles; this is a statistic we can and should improve. \n\nResearch shows that organisations with equal gender in leadership roles perform better and employee satisfaction of both men and women are higher. Most organisations have goals and are trying to improve these statistics but its proving to be a big challenge.\n\nSo get your notepad ready because I will give you some practical tips on how and where to attract more females to your organisation along with the insider tools to help retain and develop them.\n\nYou don’t need to be a manager to make a difference and help create a successful gender balanced organisation.",
            "startsAt": "2017-09-16T14:05:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Donna Edwards",
                "name": "Donna Edwards"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
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
            "startsAt": "2017-09-16T14:25:00",
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
            "id": "ff7521d0-7513-404a-a9e8-d506e6547e5d",
            "title": "Atari 2600 for a developer in 2017",
            "description": "Atari, it was out in 1977, it gave to many of us our first glance of home video games. How did they work? I mean, I am pretty sure there was not C# in 1977!\nVote and come to my talk to listen to a short story of hardcore development (no, seriously, hardcore), inspiring engineering tales and a moment to go full geek into the overlooked marriage between software and hardware.\nI promise no assembler knowledge required... Well, mostly.",
            "startsAt": "2017-09-16T14:30:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Cristian Prieto",
                "name": "Cristian Prieto"
              }
            ],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
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
            "startsAt": "2017-09-16T15:15:00",
            "endsAt": null,
            "isServiceSession": true,
            "isPlenumSession": false,
            "speakers": [],
            "categories": [],
            "roomId": 2,
            "room": "RR4",
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
            "startsAt": "2017-09-16T15:45:00",
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
            "id": "d06d45de-de42-44da-83eb-ea1d9d14b6cc",
            "title": "The Campsite Rule - Leaving the Tech Industry Better than We Found It",
            "description": "Improving the codebase for the next developer is a great goal, but what about making the industry better for the next generation? In this talk, Kris will debunk some of the damaging myths and ideas we’re all guilty of perpetuating, the ones that lead to stress and burnout. Fortunately there is an antidote - becoming a mentor! You’ll learn how you can change your own behaviour and thinking, be more supportive to those just starting out, and feel more engaged and inspired in your work - all with minimal effort. We all have a responsibility to make things just a little bit better for those who come after us.",
            "startsAt": "2017-09-16T16:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Kris Howard",
                "name": "Kris Howard"
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
            "startsAt": "2017-09-16T17:05:00",
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
            "startsAt": "2017-09-16T17:10:00",
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
        "slotStart": "2017-09-16T08:00:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "registration",
              "title": "Registration",
              "description": null,
              "startsAt": "2017-09-16T08:00:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "registration",
              "title": "Registration",
              "description": null,
              "startsAt": "2017-09-16T08:00:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "registration",
              "title": "Registration",
              "description": null,
              "startsAt": "2017-09-16T08:00:00",
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
        "slotStart": "2017-09-16T08:45:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "welcome-and-housekeeping",
              "title": "Welcome and housekeeping",
              "description": null,
              "startsAt": "2017-09-16T08:45:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "welcome-and-housekeeping",
              "title": "Welcome and housekeeping",
              "description": null,
              "startsAt": "2017-09-16T08:45:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "welcome-and-housekeeping",
              "title": "Welcome and housekeeping",
              "description": null,
              "startsAt": "2017-09-16T08:45:00",
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
        "slotStart": "2017-09-16T09:00:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "44f64f98-53ef-4344-93f6-9d852f845ed2",
              "title": "Five key challenges for software quality tomorrow",
              "description": "With the advances in our industry we can build software faster and operate it cheaper while serving more platforms and solving more problems than ever before. This is not without it's complications though, this new landscape requires teams to change their approach to reduce risk and ensure quality in their software.\n\nIn this presentation, Gojko will look at five important software quality challenges facing delivery teams due to these shifting roles. He will also present some emerging ideas that will help address these challenges and inspire you to rethink your approach to testing.",
              "startsAt": "2017-09-16T09:00:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Gojko Adzic",
                  "name": "Gojko Adzic"
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "44f64f98-53ef-4344-93f6-9d852f845ed2",
              "title": "Five key challenges for software quality tomorrow",
              "description": "With the advances in our industry we can build software faster and operate it cheaper while serving more platforms and solving more problems than ever before. This is not without it's complications though, this new landscape requires teams to change their approach to reduce risk and ensure quality in their software.\n\nIn this presentation, Gojko will look at five important software quality challenges facing delivery teams due to these shifting roles. He will also present some emerging ideas that will help address these challenges and inspire you to rethink your approach to testing.",
              "startsAt": "2017-09-16T09:00:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Gojko Adzic",
                  "name": "Gojko Adzic"
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "44f64f98-53ef-4344-93f6-9d852f845ed2",
              "title": "Five key challenges for software quality tomorrow",
              "description": "With the advances in our industry we can build software faster and operate it cheaper while serving more platforms and solving more problems than ever before. This is not without it's complications though, this new landscape requires teams to change their approach to reduce risk and ensure quality in their software.\n\nIn this presentation, Gojko will look at five important software quality challenges facing delivery teams due to these shifting roles. He will also present some emerging ideas that will help address these challenges and inspire you to rethink your approach to testing.",
              "startsAt": "2017-09-16T09:00:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Gojko Adzic",
                  "name": "Gojko Adzic"
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
        "slotStart": "2017-09-16T09:45:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "morning-tea",
              "title": "Morning tea",
              "description": null,
              "startsAt": "2017-09-16T09:45:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "morning-tea",
              "title": "Morning tea",
              "description": null,
              "startsAt": "2017-09-16T09:45:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "morning-tea",
              "title": "Morning tea",
              "description": null,
              "startsAt": "2017-09-16T09:45:00",
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
        "slotStart": "2017-09-16T10:15:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "684b7f57-fd87-4963-a7a3-b77715287347",
              "title": "Death By Good Intentions",
              "description": "After spending time in over 25 different workplaces, I've seen examples of high-performing teams, and those that are totally stifled by their environment.\n\nI've spent time trying to distill what made each of those places tick and extracted common problems. For each of those problems, I use examples to explain their effect on the team, and the solutions I've seen work to mitigate them. We'll cover topics like security theatre, tech strategy and team setup amongst others. \n\nBy the end of it you'll come away with a few tools to take back to your organisation to help your teams get stuff done and hopefully make some customers happy along the way.",
              "startsAt": "2017-09-16T10:15:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Nathan Jones",
                  "name": "Nathan Jones"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "2be131c5-155d-4207-8e24-910bf50a6894",
              "title": "Modern TypeScript is amazing!",
              "description": "You think you know TypeScript? Unless you have been looking at it recently you likely have missed some of the amazing features shipped in 2.0, 2.1 and 2.2. Some of these language features exist in very few other languages and open up so many doors.\n\nIn this talk we will introduce you to TypeScript and run through a number of the latest language features including spread/rest operators which many Babel users love, Mapped Types, Generics and cover practical examples where he has been using these features to improve the code he is writing day to day.",
              "startsAt": "2017-09-16T10:15:00",
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
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "c09518f6-58a0-4cbc-84ba-87b862d6f514",
              "title": "Stop Mocking – start testing.",
              "description": "How much value do your automated tests really provide? I will demonstrate common and regular pitfalls in automated testing. Namely, that of mis-defining what a ‘unit’ is and disregard for integration tests. Among other things I will also demonstrate how stale tests – be they failing or passing are a problem as well.\n\nTesting is a good thing, testing a lot for the sake of it is NOT. Stop mocking and actually start testing to provide the highest amount of value in your application with the least amount of code.",
              "startsAt": "2017-09-16T10:15:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Raphael Haddad",
                  "name": "Raphael Haddad"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T11:00:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T11:00:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T11:00:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T11:00:00",
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
        "slotStart": "2017-09-16T11:05:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "6916c81d-28e4-4471-8368-26f4c80aea29",
              "title": "GraphQL - A query language to empower your API consumers",
              "description": "The API economy is here, fueling disruption across many established industries. REST, as specified in Roy Fielding’s seminal dissertation, has become the architectural pattern of choice for APIs and when applied correctly allows for clients and servers to evolve in a loosely coupled manner. There are areas however where REST can deliver less than ideal client experiences. Often many HTTP requests are required to render a single view.\n\nWhile this may be a minor concern for a web app running on a WAN with low latency and high bandwidth, it can yield poor client experiences for mobile clients in particular. GraphQL is Facebook’s response to this challenge and it is quickly proving itself as an exciting alternative to RESTful APIs for a wide range of contexts. GraphQL is a query language that provides a clean and simple syntax for consumers to interrogate your APIs. These queries are strongly typed, hierarchical and enable clients to retrieve only the data they need.\n\nIn this session, we will take a hands-on look at GraphQL and see how it can be used to build APIs that are a joy to use.",
              "startsAt": "2017-09-16T11:05:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Rob Crowley",
                  "name": "Rob Crowley"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "74ad268f-38ad-4dc5-814a-f7a0437360d6",
              "title": "How feedback helped me get over myself",
              "description": "What happens when your view and opinions of yourself don’t match everyone else’s around you? People can start to think you’re conceited and pretentious. Feedback can help bridge that gap.\n \nThis is the story of a developer that wasn't used to being told the not-so-great things about them, and their journey in struggling and eventually embracing feedback (and getting over themselves).\n \nThis talk will take a look at feedback culture with a tongue-in-cheek storytelling and lessons learned approach. \n \nBy seeing the journey of someone who started with no exposure to feedback culture, you will learn what feedback can do for you and the impact it can have on your personal growth. You will also learn how to empower those around you with tips on how to give effective feedback.\n \nKey takeaways:\nWhat is feedback\nWhat is a feedback culture\nWhat are the benefits of feedback\nHow to ask for feedback\nHow to give effective feedback",
              "startsAt": "2017-09-16T11:05:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Jasmine Quek",
                  "name": "Jasmine Quek"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "d1bb10e3-c2af-4db7-93fc-dcbfe03d9b7b",
              "title": "Flying Solo - lifehack your way to a pants-optional workplace",
              "description": "Many developers harbour the dream of throwing off the shackles of corporate serfdom and experiencing the glorious freedom of self-employment. So is the grass really greener on the other side?\n\nAs a developer who took the plunge a few years ago, I can offer some honest feedback and practical advice on things like:\n* what to consider when assessing whether self-employment is right for you.\n* the different software development business models, the pros & cons of each.\n* setting up a business/company - which structure is best.\n* knowing when to quit your job.\n* pricing yourself correctly.\n* sales & marketing - critical activity or soul destroying waste of effort?\n* why on earth can’t people just pay you on time.\n* what to say to friends and relatives who think you don’t do anything all day.\n* generally everything else that I know now, that I wish I knew then.\n\nAttendees will either walk out with a solid plan of attack for starting their own business, or thankful they have a job and don’t have to deal with that rubbish.",
              "startsAt": "2017-09-16T11:05:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Sam Ritchie",
                  "name": "Sam Ritchie"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T11:50:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T11:50:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T11:50:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T11:50:00",
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
        "slotStart": "2017-09-16T11:55:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "6742a7ad-0e47-4704-86d0-22b038afe2c4",
              "title": "Mobile App Test Automation: Let's look into the future",
              "description": "In the present world, mobile applications are growing exponentially. A large number of businesses & enterprises, ranging from large corporations to start-ups, are increasing their spending on mobile app development to create an awesome customer experience & an emotional attachment with their end users. The increasing popularity of the mobile applications has surfaced a few very imminent issues, mostly related to determining the quality of these mobile applications.\n\nMobile applications typically work with limited resources; hence the resource usage needs to be monitored continuously to avoid performance issues. More conventional functional testing approaches, like user interface testing, usability testing & integration testing with underlying application programming interface, need to be employed in addition to compatibility testing and performance testing for exhaustively testing a mobile application across multiple platforms (iOS, Android, Windows). On top of that, confidential data like phone contacts, banking and other personal information, global GPS position could be disclosed by vulnerable applications & unreliable mobile networks, so sensitive applications require validating exchanged data to avoid security issues over various available mobile networks. Other factors we need to consider while testing would be user experience, testing the interruptions caused by incoming calls or text messages while the application under test is on foreground and battery. \n\n\nThis presentation outlines the mobile test automation challenges from the perspectives of user interface design, product function, performance & security. Furthermore, we also focus on some of the gaps that exist in present day mobile app automation testing & propose some future work to enhance the existing testing frameworks.",
              "startsAt": "2017-09-16T11:55:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Subrata Bhattacharjee",
                  "name": "Subrata Bhattacharjee"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "20f26760-d2bf-400a-8a73-807502c11291",
              "title": "Pair Programming - Experience from the trenches",
              "description": "What are the some of the problems software delivery teams experience? Is there a way of working that will allow software delivery teams to overcome these problems?\n\nSoftware delivery teams face challenges with productivity, code quality, team health, and knowledge sharing and code ownership. There are many ways of working that allow a team to address these issues. The challenge is to find the right way of working that helps to address these issues quickly.\n\nIn this talk, you will learn how Pair Programming is one such way of working that will help address these challenges. You will learn the mechanics of Pair Programming, things to watch out for and tips to successfully set up a pair programming session.\n\nLearning outcomes:\nWhat is pair programming?\nWhat are the benefits of pair programming?\nWhat things to look out for?\nWhy some people find it hard?\nWhen not to pair program?",
              "startsAt": "2017-09-16T11:55:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Sameer Chauhan",
                  "name": "Sameer Chauhan"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "7e482ec2-9657-40ea-a3dd-ba0c53f824c3",
              "title": "A (gentle) introduction to Neural Networks",
              "description": "As developers we’ve all heard a lot about Machine Learning, Big Data and I'm certain that most if not all of us would love to get involved in this exciting field. However the pressures of juggling the demands of a full-time career in software can make getting started in such a broad field feel a little daunting. I’d like to change that!\n\nWhat I’d like to cover in this talk are the fundamental concepts of Linear Regression. Next we’ll look at Gradient Descent, a simple, yet powerful technique we can use to find the ‘best fitting’ parameter values for our model. Next, a we’ll take a quick look at Logistic Regression and discuss the central tenant of any Neural Network, the Perceptron. With this understanding, we can jump into building and initializing a small Neural Network. The last piece of the puzzle is  how we train a Neural Network. We’ll discuss Back Propagation, an algorithm that retrospectively updates the weightings between nodes our Neural Network. With that knowledge in hand, we’ll have everything required to throw some unseen data at our  Neural Network and watch the magic unfold.  Last but not least, is a look at how Neural Networks can be used in practice. Whilst the solve many real life problems, from enabling an autonomous vehicle to navigate a busy highway to detecting fraudulent banking patterns, for the purposes of this talk I’ll be demonstrating how a neural network can be used to solve the age old problem of handwriting recognition.\n\nBy attending this talk attendees will walk away with a clear understanding of the deceptively simple techniques used to build the majority of the learning algorithms used in industry (Linear Regression, Gradient Descent). My goal is to motivate attendees to seek ongoing education in this space, and at the conclusion of the talk references will be provided to material that I’ve found invaluable in my personal journey, including a brief review of Coursera’s  Machine Learning MOOC.",
              "startsAt": "2017-09-16T11:55:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Rami Ruhayel",
                  "name": "Rami Ruhayel"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T12:20:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "8c7a2d53-bc00-436f-9150-3f7db76b3610",
              "title": "Web, Wellness and Getting Sh*t Done",
              "description": "In an industry that doesn't sleep and where there's probably something new to learn or try released by the time you’ve finished reading this paragraph, it’s no wonder we get overwhelmed and sometimes lose focus.\n\nThere's a lot to be said about pressing pause, resetting and unfolding that roadmap often to see if you’re still going in the right direction. \n\nBeing a brilliant dev is great, but being a brilliant dev who understands balance, how to manage time, how to focus and be aware of when to put the foot down on the pedal or that you might need to pull over for a nap… well, this person becomes a super dev.",
              "startsAt": "2017-09-16T12:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Patima Tantiprasut",
                  "name": "Patima Tantiprasut"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "20f26760-d2bf-400a-8a73-807502c11291",
              "title": "Pair Programming - Experience from the trenches",
              "description": "What are the some of the problems software delivery teams experience? Is there a way of working that will allow software delivery teams to overcome these problems?\n\nSoftware delivery teams face challenges with productivity, code quality, team health, and knowledge sharing and code ownership. There are many ways of working that allow a team to address these issues. The challenge is to find the right way of working that helps to address these issues quickly.\n\nIn this talk, you will learn how Pair Programming is one such way of working that will help address these challenges. You will learn the mechanics of Pair Programming, things to watch out for and tips to successfully set up a pair programming session.\n\nLearning outcomes:\nWhat is pair programming?\nWhat are the benefits of pair programming?\nWhat things to look out for?\nWhy some people find it hard?\nWhen not to pair program?",
              "startsAt": "2017-09-16T12:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Sameer Chauhan",
                  "name": "Sameer Chauhan"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "7e482ec2-9657-40ea-a3dd-ba0c53f824c3",
              "title": "A (gentle) introduction to Neural Networks",
              "description": "As developers we’ve all heard a lot about Machine Learning, Big Data and I'm certain that most if not all of us would love to get involved in this exciting field. However the pressures of juggling the demands of a full-time career in software can make getting started in such a broad field feel a little daunting. I’d like to change that!\n\nWhat I’d like to cover in this talk are the fundamental concepts of Linear Regression. Next we’ll look at Gradient Descent, a simple, yet powerful technique we can use to find the ‘best fitting’ parameter values for our model. Next, a we’ll take a quick look at Logistic Regression and discuss the central tenant of any Neural Network, the Perceptron. With this understanding, we can jump into building and initializing a small Neural Network. The last piece of the puzzle is  how we train a Neural Network. We’ll discuss Back Propagation, an algorithm that retrospectively updates the weightings between nodes our Neural Network. With that knowledge in hand, we’ll have everything required to throw some unseen data at our  Neural Network and watch the magic unfold.  Last but not least, is a look at how Neural Networks can be used in practice. Whilst the solve many real life problems, from enabling an autonomous vehicle to navigate a busy highway to detecting fraudulent banking patterns, for the purposes of this talk I’ll be demonstrating how a neural network can be used to solve the age old problem of handwriting recognition.\n\nBy attending this talk attendees will walk away with a clear understanding of the deceptively simple techniques used to build the majority of the learning algorithms used in industry (Linear Regression, Gradient Descent). My goal is to motivate attendees to seek ongoing education in this space, and at the conclusion of the talk references will be provided to material that I’ve found invaluable in my personal journey, including a brief review of Coursera’s  Machine Learning MOOC.",
              "startsAt": "2017-09-16T12:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Rami Ruhayel",
                  "name": "Rami Ruhayel"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T12:40:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "lunch",
              "title": "Lunch",
              "description": null,
              "startsAt": "2017-09-16T12:40:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "lunch",
              "title": "Lunch",
              "description": null,
              "startsAt": "2017-09-16T12:40:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "lunch",
              "title": "Lunch",
              "description": null,
              "startsAt": "2017-09-16T12:40:00",
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
        "slotStart": "2017-09-16T13:40:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "286930b8-ab3d-4a33-9b3a-ba863032aa1d",
              "title": "Congrats, You are a Solution Architect, now what?",
              "description": "Ok so you have been made a tech lead/architect and you have been tasked to build an elegant, performant, scalable, cloud application. What would you do? There are a lot of decisions that you are going to make and you are accountable for these. Things like what cloud provider to choose? What data storage you choose? What compute unit to choose? How to secure it? How to protect it? How to communicate the design well to the devs to implement it? What messaging components to use? How to verify you design against functional and non functional specs? And the list goes on and on\nI have been lucky enough to be involved and leading some of the great projects in my career and I was there from day 1 ( in some cases). I have had to make many of these decisions. Some of them were good and others turned out not too great.\nIn this talk, I will share with you my experience and the approach that I have developed. My process works for most project and it creates a good recipe for rinse and repeat. The talk would be full of demos to demo the impact of these decision.",
              "startsAt": "2017-09-16T13:40:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Has AlTaiar",
                  "name": "Has AlTaiar"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "3a75a53c-3cb1-41dc-ba5a-b74efc8546ac",
              "title": "Quantum Encryption - New Advances in Data Security",
              "description": "There are exciting advances being made in the way we securely transport data. At present there is a technological space race between the super power nations on who can crack this first. The implications are massive!\n\nIn this talk I will detail  how this new approach works, why data security is so important and what it could mean to us all in the future.\n\nWe will also have a fun looking back on existing data security methods of times gone by.",
              "startsAt": "2017-09-16T13:40:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Will Webster",
                  "name": "Will Webster"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "83ce0668-9d21-41bb-802a-50a810abfa9a",
              "title": "Attraction and retention strategies for Women in tech",
              "description": "Women make up 31% of the Australian IT workforce with only 14% in leadership roles; this is a statistic we can and should improve. \n\nResearch shows that organisations with equal gender in leadership roles perform better and employee satisfaction of both men and women are higher. Most organisations with goals and are trying to improve these statistics but its proving to be a big challenge.\n\nSo get your notepad ready because I will give you some practical tips on how and where to attract more females to your organisation along with the insider tools to help retain and develop them.\n\nYou don’t need to be a manager to make a difference and help create a successful gender balanced organisation.",
              "startsAt": "2017-09-16T13:40:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Donna Edwards",
                  "name": "Donna Edwards"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T14:05:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "286930b8-ab3d-4a33-9b3a-ba863032aa1d",
              "title": "Congrats, You are a Solution Architect, now what?",
              "description": "Ok so you have been made a tech lead/architect and you have been tasked to build an elegant, performant, scalable, cloud application. What would you do? There are a lot of decisions that you are going to make and you are accountable for these. Things like what cloud provider to choose? What data storage you choose? What compute unit to choose? How to secure it? How to protect it? How to communicate the design well to the devs to implement it? What messaging components to use? How to verify you design against functional and non functional specs? And the list goes on and on\nI have been lucky enough to be involved and leading some of the great projects in my career and I was there from day 1 ( in some cases). I have had to make many of these decisions. Some of them were good and others turned out not too great.\nIn this talk, I will share with you my experience and the approach that I have developed. My process works for most project and it creates a good recipe for rinse and repeat. The talk would be full of demos to demo the impact of these decision.",
              "startsAt": "2017-09-16T14:05:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Has AlTaiar",
                  "name": "Has AlTaiar"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "2c375902-fe42-4009-96ca-1206ab4447a9",
              "title": "Serverless architecture for small-scale projects",
              "description": "\"Serverless\" is one of the latest trending buzzwords in the industry.  Much of the hype about this architectural style is about the scalability and ease of infrastructure management for large-scale projects, with a lot of users, and big volumes of data.\n\nHowever, the serverless architecture is not solely concerned with the large-scale, and can be extremely cost-effective for small-scale projects.\n\nThis session explores some ways of using serverless architecture, tools and services for smaller projects with a limited budget, based on professional experience and successes utilising these technologies in various business domains, including citizen science, academic research, and government.",
              "startsAt": "2017-09-16T14:05:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Ben New",
                  "name": "Ben New"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "83ce0668-9d21-41bb-802a-50a810abfa9a",
              "title": "Attraction and retention strategies for Women in tech",
              "description": "Women make up 31% of the Australian IT workforce with only 14% in leadership roles; this is a statistic we can and should improve. \n\nResearch shows that organisations with equal gender in leadership roles perform better and employee satisfaction of both men and women are higher. Most organisations with goals and are trying to improve these statistics but its proving to be a big challenge.\n\nSo get your notepad ready because I will give you some practical tips on how and where to attract more females to your organisation along with the insider tools to help retain and develop them.\n\nYou don’t need to be a manager to make a difference and help create a successful gender balanced organisation.",
              "startsAt": "2017-09-16T14:05:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Donna Edwards",
                  "name": "Donna Edwards"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T14:25:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T14:25:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T14:25:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2017-09-16T14:25:00",
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
        "slotStart": "2017-09-16T14:30:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "36bc7011-11a7-4c33-bb84-e0e49da88b39",
              "title": "Web Accessibility: Responsibilities, Laws and Policies, Australian Requirements",
              "description": "Learn the approach followed in Australia related to the requirements for digital accessibility.  It certainly won't be boring or technical, but will provide you with the knowledge you need to address the requirements and persuade those within your organisation that this is not just a 'good thing to do', but the 'smart thing to do', the 'right thing to do' and is 'good for business' at the same time!\n\nIn this session, we will explore the Australian context of web accessibility including the new Australian Standard for procurement of ICT products (AS 301549), the W3C's new release of Web Accessibility Laws and Policies which show the Australian setting, the procedures followed by the Australian Human Rights Commission in administering the Disability Discrimination Act and other related materials.\n\nCome along and get informed!",
              "startsAt": "2017-09-16T14:30:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Dr Vivienne Conway",
                  "name": "Dr Vivienne Conway"
                }
              ],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "de3f62ca-fd85-43a0-865c-fd17102588bb",
              "title": "What a real sprint looks like",
              "description": "A lot of us have worked in \"agile\" teams that if we're being honest are about as agile as a rock, and a surprisingly high number of people in software really don't know what a successful agile process looks like.\n\nI want to show you a real world sprint from a mature Scrum team, exploring how they actually deliver, and how the Scrum meetings work in practice and why they're important.\n\nIf you've never seen a mature Scrum team in action before you'll get to see what a high performing one looks like, and if you're already agile you can compare and hopefully pick up some tips or share your own.",
              "startsAt": "2017-09-16T14:30:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Ian Hughes",
                  "name": "Ian Hughes"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "ff7521d0-7513-404a-a9e8-d506e6547e5d",
              "title": "Atari 2600 for a developer in 2017",
              "description": "Atari, it was out in 1977, it gave to many of us our first glance of home video games. How did they work? I mean, I am pretty sure there was not C# in 1977!\nVote and come to my talk to listen to a short story of hardcore development (no, seriously, hardcore), inspiring engineering tales and a moment to go full geek into the overlooked marriage between software and hardware.\nI promise no assembler knowledge required... Well, mostly.",
              "startsAt": "2017-09-16T14:30:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Cristian Prieto",
                  "name": "Cristian Prieto"
                }
              ],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T15:15:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "afternoon-tea",
              "title": "Afternoon tea",
              "description": null,
              "startsAt": "2017-09-16T15:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": false,
              "speakers": [],
              "categories": [],
              "roomId": 0,
              "room": "RR5",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 1,
            "name": "M6",
            "index": 1,
            "session": {
              "id": "f14fe883-7570-4459-b71e-4f6165ff99b0",
              "title": "Speaker Panel",
              "description": "Join selected speakers during the afternoon tea break for an extended Q&A panel session. Ask more detailed questions on their topic, or ask the questions you didn’t get a chance to after their presentation.\n\nFormat will be an open Q&A session, so come with your coffee, grab a microphone and join in!",
              "startsAt": "2017-09-16T15:15:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Donna Edwards, Nathan Jones, Rami Ruhayel, Patima Tantiprasut",
                  "name": "Donna Edwards, Nathan Jones, Rami Ruhayel, Patima Tantiprasut"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "M6",
              "liveUrl": null,
              "recordingUrl": null,
              "status": null,
              "isInformed": true,
              "isConfirmed": true
            }
          },
          {
            "id": 2,
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "afternoon-tea",
              "title": "Afternoon tea",
              "description": null,
              "startsAt": "2017-09-16T15:15:00",
              "endsAt": null,
              "isServiceSession": true,
              "isPlenumSession": false,
              "speakers": [],
              "categories": [],
              "roomId": 2,
              "room": "RR4",
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
        "slotStart": "2017-09-16T15:45:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "sponsor-announcements-and-prize-draw!!!",
              "title": "Sponsor announcements and PRIZE DRAW!!!",
              "description": null,
              "startsAt": "2017-09-16T15:45:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "sponsor-announcements-and-prize-draw!!!",
              "title": "Sponsor announcements and PRIZE DRAW!!!",
              "description": null,
              "startsAt": "2017-09-16T15:45:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "sponsor-announcements-and-prize-draw!!!",
              "title": "Sponsor announcements and PRIZE DRAW!!!",
              "description": null,
              "startsAt": "2017-09-16T15:45:00",
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
        "slotStart": "2017-09-16T16:20:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "d06d45de-de42-44da-83eb-ea1d9d14b6cc",
              "title": "The Campsite Rule - Leaving the Tech Industry Better than We Found It",
              "description": "Improving the codebase for the next developer is a great goal, but what about making the industry better for the next generation? In this talk, Kris will debunk some of the damaging myths and ideas we’re all guilty of perpetuating, the ones that lead to stress and burnout. Fortunately there is an antidote - becoming a mentor! You’ll learn how you can change your own behaviour and thinking, be more supportive to those just starting out, and feel more engaged and inspired in your work - all with minimal effort. We all have a responsibility to make things just a little bit better for those who come after us.",
              "startsAt": "2017-09-16T16:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Kris Howard",
                  "name": "Kris Howard"
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "d06d45de-de42-44da-83eb-ea1d9d14b6cc",
              "title": "The Campsite Rule - Leaving the Tech Industry Better than We Found It",
              "description": "Improving the codebase for the next developer is a great goal, but what about making the industry better for the next generation? In this talk, Kris will debunk some of the damaging myths and ideas we’re all guilty of perpetuating, the ones that lead to stress and burnout. Fortunately there is an antidote - becoming a mentor! You’ll learn how you can change your own behaviour and thinking, be more supportive to those just starting out, and feel more engaged and inspired in your work - all with minimal effort. We all have a responsibility to make things just a little bit better for those who come after us.",
              "startsAt": "2017-09-16T16:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Kris Howard",
                  "name": "Kris Howard"
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "d06d45de-de42-44da-83eb-ea1d9d14b6cc",
              "title": "The Campsite Rule - Leaving the Tech Industry Better than We Found It",
              "description": "Improving the codebase for the next developer is a great goal, but what about making the industry better for the next generation? In this talk, Kris will debunk some of the damaging myths and ideas we’re all guilty of perpetuating, the ones that lead to stress and burnout. Fortunately there is an antidote - becoming a mentor! You’ll learn how you can change your own behaviour and thinking, be more supportive to those just starting out, and feel more engaged and inspired in your work - all with minimal effort. We all have a responsibility to make things just a little bit better for those who come after us.",
              "startsAt": "2017-09-16T16:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Kris Howard",
                  "name": "Kris Howard"
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
        "slotStart": "2017-09-16T17:05:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "thank-yous-and-wrap-up",
              "title": "Thank yous and wrap up",
              "description": null,
              "startsAt": "2017-09-16T17:05:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "thank-yous-and-wrap-up",
              "title": "Thank yous and wrap up",
              "description": null,
              "startsAt": "2017-09-16T17:05:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "thank-yous-and-wrap-up",
              "title": "Thank yous and wrap up",
              "description": null,
              "startsAt": "2017-09-16T17:05:00",
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
        "slotStart": "2017-09-16T17:10:00",
        "rooms": [
          {
            "id": 0,
            "name": "RR5",
            "index": 0,
            "session": {
              "id": "afterparty",
              "title": "Afterparty",
              "description": null,
              "startsAt": "2017-09-16T17:10:00",
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
            "name": "M6",
            "index": 1,
            "session": {
              "id": "afterparty",
              "title": "Afterparty",
              "description": null,
              "startsAt": "2017-09-16T17:10:00",
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
            "name": "RR4",
            "index": 2,
            "session": {
              "id": "afterparty",
              "title": "Afterparty",
              "description": null,
              "startsAt": "2017-09-16T17:10:00",
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
        platinum: [
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/static/images/sponsors/bankwest.png',
                logoUrlLightMode: '/static/images/sponsors/bankwest.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Readify',
                logoUrlDarkMode: '/static/images/sponsors/readify.png',
                logoUrlLightMode: '/static/images/sponsors/readify.png',
                website: 'https://readify.net/',
                quote: undefined,
            },
            {
                name: 'Vocus',
                logoUrlDarkMode: '/static/images/sponsors/vocus.png',
                logoUrlLightMode: '/static/images/sponsors/vocus.png',
                website: 'https://www.vocus.com.au/',
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
