import { DateTime } from 'luxon'
import type { ConferenceYear } from '../types'
import { burswoodOnSwanVenue } from '../venues/burswood-on-swan'

export const conference2015: ConferenceYear = {
    kind: 'conference',
    year: '2015',
    conferenceDate: DateTime.fromISO('2015-08-29'),
    sessionizeUrl: undefined,

    venue: burswoodOnSwanVenue,

    sessions: {
        kind: 'session-data',
        sessions: [
  {
    "date": "2015-08-29T00:00:00",
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
            "startsAt": "2015-08-29T08:30:00",
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
            "startsAt": "2015-08-29T09:00:00",
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
            "id": "599fc187-2f4a-49d0-8531-2634467fb8f0",
            "title": "What happens when...?",
            "description": "Starting from an innocent question - what happens when you type google.com into a browser? - we'll explore how complex our field of computing has become. It'll be a ride through acronym soup and rarely seen debugging experiences, as we peel back layer upon layer of magic. You'll leave this talk with a reinvigorated passion for complexity and problem solving. Or, you'll want to rage quit and take up horticulture.",
            "startsAt": "2015-08-29T09:15:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Tatham Oddie",
                "name": "Tatham Oddie"
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
            "startsAt": "2015-08-29T10:00:00",
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
            "id": "1d419392-76d0-44e3-904c-a5bec3cfc551",
            "title": "Microservice design patterns for line of business applications",
            "description": "So you broke up your big, unmaintainable monolithic system into microservices. Good for you. Each piece is now easy to understand and maintain. Except things didn't get simpler. You've got lots of dependencies between your services to implement your business processes. You're having to modify many services to change your processes and the complexity is exploding. This isn't any better, if you can't improve things you're going back to the old way of doing things.\n\nThis talk discusses how you can use just three simple architectural patterns to design and implement microservice systems that can isolate the complexity of changes and support managing the evolution of business logic and processes over time. As a bonus it includes other buzzwords like event sourcing and CQRS at no extra charge. Process managers also deal with the distributed non-transactional nature of the system.",
            "startsAt": "2015-08-29T10:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Colin Scott",
                "name": "Colin Scott"
              },
              {
                "id": "Zulhafiz Akbar",
                "name": "Zulhafiz Akbar"
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
            "startsAt": "2015-08-29T11:05:00",
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
            "id": "fc7289f8-575d-4d65-992b-51d1ee218334",
            "title": "Let Azure Machine Learning APIs teach your app to be smarter.",
            "description": "Most of us saw the how-old.net demo from build this year. What if you want to include some of those smarts into your app?\n\nWe'll have a look at some of the Azure Machine Learning APIs to see how easy it is to give your app an education.",
            "startsAt": "2015-08-29T11:10:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Doug Paice",
                "name": "Doug Paice"
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
            "startsAt": "2015-08-29T11:55:00",
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
            "id": "3cce7ebd-b91e-40e5-aa86-4dc9830a7e84",
            "title": "What makes React different?",
            "description": "There has been a heap of talk about web frameworks recently, React is one which is particularly interesting.\n\nReact takes a very different approach to how you build and compose your JavaScript applications. After this session you will have a good understanding what React is, how it is different to other frameworks like Angular and Ember and the reasons you might want to give it a go.",
            "startsAt": "2015-08-29T12:55:00",
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
            "startsAt": "2015-08-29T13:40:00",
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
            "id": "674f1340-94a4-43b2-b8ec-0a93f7b80060",
            "title": "Containers, Docker and... Cats!",
            "description": "Containers, docker, microservices... I am pretty sure I have heard those words before, they have been pretty hardcore lately...\n\nSo, this thing, \"containers\" what is all about? is it like a big box where you put things? would that run in Windows? is just another virtual machine? why is so \"awesome\"? can I fit a cat in a shoe box?\n\nI will try to explain all those questions in a simple language, about what are containers, what are they right now the sweet potato and why I should care and why in a few months you will probably be using them.\n\nVote for this and I promise a lot of cat pictures as well...",
            "startsAt": "2015-08-29T13:45:00",
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
            "startsAt": "2015-08-29T14:30:00",
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
            "id": "d07b5bd2-32f9-4e61-8232-5bcf3572d111",
            "title": "Octopus Deploy or How to Stop Deploying like an Idiot",
            "description": "Ever had your site go down because Jim accidentally copied over the web.config? Ever broken out into a cold sweat because you forgot the where clause was in a production update script? Well stop deploying like an idiot.\n\nDeploying applications has traditionally been one of the most dangerous parts of software development. It's often very hands-on, relying on the right people doing the right thing at the right time, and is therefore extremely prone to failure.\n\nIn this presentation, I'll briefly look at why developers should automate their deployment process as soon as possible. I'll looks at some of the ways teams try to manage their deployments and reduce the danger. Finally, I'll show you why a tool like Octopus Deploy is the best way to do it. We'll look at some real-world Octopus implementations, including very complex environments, in-depth testing, and automated rollbacks.",
            "startsAt": "2015-08-29T14:50:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Damian Brady",
                "name": "Damian Brady"
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
            "id": "sponsor-announcements-and-prize-draw!!!",
            "title": "Sponsor announcements and PRIZE DRAW!!!",
            "description": null,
            "startsAt": "2015-08-29T15:35:00",
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
            "id": "4ccb057b-c3d1-472a-8ad9-83b9f1e17c14",
            "title": "Why Pointers Still Matter",
            "description": "As computers continue to become faster, and programming languages more powerful and abstract, the question arises: is there still a need for the humble pointer? I will demonstrate why the answer is 'yes', and show some practical scenarios in C# where some basic pointer skills pave the way for simpler and more efficient applications on today's desktops and devices.",
            "startsAt": "2015-08-29T16:15:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": true,
            "speakers": [
              {
                "id": "Joe Albahari",
                "name": "Joe Albahari"
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
            "id": "afterparty",
            "title": "Afterparty",
            "description": null,
            "startsAt": "2015-08-29T16:50:00",
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
            "id": "event-finish",
            "title": "Event finish",
            "description": null,
            "startsAt": "2015-08-29T19:00:00",
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
        "name": "Side Room",
        "sessions": [
          {
            "id": "799ef773-81c2-4c58-b942-64a1152cbf2e",
            "title": "How Git Corrupts The Mind",
            "description": "Lots of companies are adopting Git, and for many developers they're quite content to just use the basics of Git when they transition away from whatever version control system they used previously. But why stop there?\n\nIn this talk I want to walk through some of the concepts of Git and distributed version control, talk about what' happening under the hood, and show how working with Git can changes your workflow radically - for the better.",
            "startsAt": "2015-08-29T10:20:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Brendan Forster",
                "name": "Brendan Forster"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "3a6d6a60-74b5-4dea-93b5-985f91f340f3",
            "title": "Patterns for Internet-of-Things Projects in Azure",
            "description": "In this session Mitch will discuss the maturing patterns that are being adopted by development teams building IoT solutions in the cloud. We'll apply these patterns to the Azure platform and look at the specific technologies in the platform and how they can be applied as building blocks to implement the discussed patterns.",
            "startsAt": "2015-08-29T11:10:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Mitch Denny",
                "name": "Mitch Denny"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "5a2911ec-207d-45ca-a6fa-11892bb92bbd",
            "title": "Cordova and Xamarin - Mobile dev from the trenches",
            "description": "We've all heard of the wonders of cross platform mobile development before. Xamarin and Cordova are well known in our industry now, but are they really silver bullets? With so many ways to develop mobile apps out there, how do we make a choice and how to we avoid the common pitfalls of each of those?\n\nIn this talk, Greg James from Readify will run through Xamarin and Cordova to demystify the above statements and show you the ropes. There'll be sharing some war stories, tools, tips and tricks to get the most out of (mostly) painfree mobile development with Xamarin and Cordova.",
            "startsAt": "2015-08-29T12:55:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Greg James",
                "name": "Greg James"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "44d4e2ec-108c-4142-a7ce-4bf75480f30d",
            "title": ".NET actor programming with Akka.NET",
            "description": "Akka.NET is an open-source .NET port of the Akka actor programming toolkit and runtime from the JVM. The toolkit provides an abstraction layer to help programmers deal with the current challenges and optimise development for modern hardware and infrastructure: multi-core architecture, cloud infrastructure, and distributed computing.\n\nWe will talk about various actor programming concepts and fundamentals, and learn how to apply Akka.NET toolkit in your applications to make it scalable and fault-tolerant.",
            "startsAt": "2015-08-29T13:45:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Herdy Handoko",
                "name": "Herdy Handoko"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room",
            "liveUrl": null,
            "recordingUrl": null,
            "status": null,
            "isInformed": true,
            "isConfirmed": true
          },
          {
            "id": "2e79c7bf-0a42-4fa2-b9c2-96963648377f",
            "title": "Microtesting: How We Set Fire To The Testing Pyramid While Ensuring Confidence",
            "description": "As seen at Yow! West.\n\nDo you want to write less tests for the same amount of confidence?\n\nDo you want to print out the testing pyramid on a dot matrix printer, take it outside and set fire to it?\n\nHow confident are you that you can survive the refactoring apocalypse without breaking your tests?\n\nAs consultants, my colleagues and I get to see how testing is performed across many different organisations and have a chance to experiment with different testing strategies across multiple projects. Through this experience, we have developed a pragmatic process for setting an initial testing strategy that is as simple as possible and iterating on that strategy over time to evolve it based on how it performs. We have also settled on a style of testing that has proved to be very effective at reducing testing effort while maintaining (or even improving) confidence from our tests.\n\nThis talk will focus on some of our learnings and we will cover the different types of testing and how they interact, breaking apart the usual practice of testing all applications in the same way, the mysterious relationship between speed and confidence, how we were able to throw away the testing pyramid (and watch it burnnnnn!!!) and a number of techniques that have worked well for us when testing our applications.",
            "startsAt": "2015-08-29T14:50:00",
            "endsAt": null,
            "isServiceSession": false,
            "isPlenumSession": false,
            "speakers": [
              {
                "id": "Rob Moore",
                "name": "Rob Moore"
              },
              {
                "id": "Matt Davies",
                "name": "Matt Davies"
              }
            ],
            "categories": [],
            "roomId": 1,
            "room": "Side Room",
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
        "slotStart": "2015-08-29T08:30:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "registration",
              "title": "Registration",
              "description": null,
              "startsAt": "2015-08-29T08:30:00",
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
        "slotStart": "2015-08-29T09:00:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "welcome-and-housekeeping",
              "title": "Welcome and housekeeping",
              "description": null,
              "startsAt": "2015-08-29T09:00:00",
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
        "slotStart": "2015-08-29T09:15:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "599fc187-2f4a-49d0-8531-2634467fb8f0",
              "title": "What happens when...?",
              "description": "Starting from an innocent question - what happens when you type google.com into a browser? - we'll explore how complex our field of computing has become. It'll be a ride through acronym soup and rarely seen debugging experiences, as we peel back layer upon layer of magic. You'll leave this talk with a reinvigorated passion for complexity and problem solving. Or, you'll want to rage quit and take up horticulture.",
              "startsAt": "2015-08-29T09:15:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Tatham Oddie",
                  "name": "Tatham Oddie"
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
        "slotStart": "2015-08-29T10:00:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "morning-tea",
              "title": "Morning tea",
              "description": null,
              "startsAt": "2015-08-29T10:00:00",
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
        "slotStart": "2015-08-29T10:20:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "1d419392-76d0-44e3-904c-a5bec3cfc551",
              "title": "Microservice design patterns for line of business applications",
              "description": "So you broke up your big, unmaintainable monolithic system into microservices. Good for you. Each piece is now easy to understand and maintain. Except things didn't get simpler. You've got lots of dependencies between your services to implement your business processes. You're having to modify many services to change your processes and the complexity is exploding. This isn't any better, if you can't improve things you're going back to the old way of doing things.\n\nThis talk discusses how you can use just three simple architectural patterns to design and implement microservice systems that can isolate the complexity of changes and support managing the evolution of business logic and processes over time. As a bonus it includes other buzzwords like event sourcing and CQRS at no extra charge. Process managers also deal with the distributed non-transactional nature of the system.",
              "startsAt": "2015-08-29T10:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Colin Scott",
                  "name": "Colin Scott"
                },
                {
                  "id": "Zulhafiz Akbar",
                  "name": "Zulhafiz Akbar"
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
            "name": "Side Room",
            "index": 1,
            "session": {
              "id": "799ef773-81c2-4c58-b942-64a1152cbf2e",
              "title": "How Git Corrupts The Mind",
              "description": "Lots of companies are adopting Git, and for many developers they're quite content to just use the basics of Git when they transition away from whatever version control system they used previously. But why stop there?\n\nIn this talk I want to walk through some of the concepts of Git and distributed version control, talk about what' happening under the hood, and show how working with Git can changes your workflow radically - for the better.",
              "startsAt": "2015-08-29T10:20:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Brendan Forster",
                  "name": "Brendan Forster"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room",
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
        "slotStart": "2015-08-29T11:05:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2015-08-29T11:05:00",
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
        "slotStart": "2015-08-29T11:10:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "fc7289f8-575d-4d65-992b-51d1ee218334",
              "title": "Let Azure Machine Learning APIs teach your app to be smarter.",
              "description": "Most of us saw the how-old.net demo from build this year. What if you want to include some of those smarts into your app?\n\nWe'll have a look at some of the Azure Machine Learning APIs to see how easy it is to give your app an education.",
              "startsAt": "2015-08-29T11:10:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Doug Paice",
                  "name": "Doug Paice"
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
            "name": "Side Room",
            "index": 1,
            "session": {
              "id": "3a6d6a60-74b5-4dea-93b5-985f91f340f3",
              "title": "Patterns for Internet-of-Things Projects in Azure",
              "description": "In this session Mitch will discuss the maturing patterns that are being adopted by development teams building IoT solutions in the cloud. We'll apply these patterns to the Azure platform and look at the specific technologies in the platform and how they can be applied as building blocks to implement the discussed patterns.",
              "startsAt": "2015-08-29T11:10:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Mitch Denny",
                  "name": "Mitch Denny"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room",
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
        "slotStart": "2015-08-29T11:55:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "lunch",
              "title": "Lunch",
              "description": null,
              "startsAt": "2015-08-29T11:55:00",
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
        "slotStart": "2015-08-29T12:55:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "3cce7ebd-b91e-40e5-aa86-4dc9830a7e84",
              "title": "What makes React different?",
              "description": "There has been a heap of talk about web frameworks recently, React is one which is particularly interesting.\n\nReact takes a very different approach to how you build and compose your JavaScript applications. After this session you will have a good understanding what React is, how it is different to other frameworks like Angular and Ember and the reasons you might want to give it a go.",
              "startsAt": "2015-08-29T12:55:00",
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
            "name": "Side Room",
            "index": 1,
            "session": {
              "id": "5a2911ec-207d-45ca-a6fa-11892bb92bbd",
              "title": "Cordova and Xamarin - Mobile dev from the trenches",
              "description": "We've all heard of the wonders of cross platform mobile development before. Xamarin and Cordova are well known in our industry now, but are they really silver bullets? With so many ways to develop mobile apps out there, how do we make a choice and how to we avoid the common pitfalls of each of those?\n\nIn this talk, Greg James from Readify will run through Xamarin and Cordova to demystify the above statements and show you the ropes. There'll be sharing some war stories, tools, tips and tricks to get the most out of (mostly) painfree mobile development with Xamarin and Cordova.",
              "startsAt": "2015-08-29T12:55:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Greg James",
                  "name": "Greg James"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room",
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
        "slotStart": "2015-08-29T13:40:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "changeover",
              "title": "Changeover",
              "description": null,
              "startsAt": "2015-08-29T13:40:00",
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
        "slotStart": "2015-08-29T13:45:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "674f1340-94a4-43b2-b8ec-0a93f7b80060",
              "title": "Containers, Docker and... Cats!",
              "description": "Containers, docker, microservices... I am pretty sure I have heard those words before, they have been pretty hardcore lately...\n\nSo, this thing, \"containers\" what is all about? is it like a big box where you put things? would that run in Windows? is just another virtual machine? why is so \"awesome\"? can I fit a cat in a shoe box?\n\nI will try to explain all those questions in a simple language, about what are containers, what are they right now the sweet potato and why I should care and why in a few months you will probably be using them.\n\nVote for this and I promise a lot of cat pictures as well...",
              "startsAt": "2015-08-29T13:45:00",
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
            "name": "Side Room",
            "index": 1,
            "session": {
              "id": "44d4e2ec-108c-4142-a7ce-4bf75480f30d",
              "title": ".NET actor programming with Akka.NET",
              "description": "Akka.NET is an open-source .NET port of the Akka actor programming toolkit and runtime from the JVM. The toolkit provides an abstraction layer to help programmers deal with the current challenges and optimise development for modern hardware and infrastructure: multi-core architecture, cloud infrastructure, and distributed computing.\n\nWe will talk about various actor programming concepts and fundamentals, and learn how to apply Akka.NET toolkit in your applications to make it scalable and fault-tolerant.",
              "startsAt": "2015-08-29T13:45:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Herdy Handoko",
                  "name": "Herdy Handoko"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room",
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
        "slotStart": "2015-08-29T14:30:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "afternoon-tea",
              "title": "Afternoon tea",
              "description": null,
              "startsAt": "2015-08-29T14:30:00",
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
        "slotStart": "2015-08-29T14:50:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "d07b5bd2-32f9-4e61-8232-5bcf3572d111",
              "title": "Octopus Deploy or How to Stop Deploying like an Idiot",
              "description": "Ever had your site go down because Jim accidentally copied over the web.config? Ever broken out into a cold sweat because you forgot the where clause was in a production update script? Well stop deploying like an idiot.\n\nDeploying applications has traditionally been one of the most dangerous parts of software development. It's often very hands-on, relying on the right people doing the right thing at the right time, and is therefore extremely prone to failure.\n\nIn this presentation, I'll briefly look at why developers should automate their deployment process as soon as possible. I'll looks at some of the ways teams try to manage their deployments and reduce the danger. Finally, I'll show you why a tool like Octopus Deploy is the best way to do it. We'll look at some real-world Octopus implementations, including very complex environments, in-depth testing, and automated rollbacks.",
              "startsAt": "2015-08-29T14:50:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Damian Brady",
                  "name": "Damian Brady"
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
            "name": "Side Room",
            "index": 1,
            "session": {
              "id": "2e79c7bf-0a42-4fa2-b9c2-96963648377f",
              "title": "Microtesting: How We Set Fire To The Testing Pyramid While Ensuring Confidence",
              "description": "As seen at Yow! West.\n\nDo you want to write less tests for the same amount of confidence?\n\nDo you want to print out the testing pyramid on a dot matrix printer, take it outside and set fire to it?\n\nHow confident are you that you can survive the refactoring apocalypse without breaking your tests?\n\nAs consultants, my colleagues and I get to see how testing is performed across many different organisations and have a chance to experiment with different testing strategies across multiple projects. Through this experience, we have developed a pragmatic process for setting an initial testing strategy that is as simple as possible and iterating on that strategy over time to evolve it based on how it performs. We have also settled on a style of testing that has proved to be very effective at reducing testing effort while maintaining (or even improving) confidence from our tests.\n\nThis talk will focus on some of our learnings and we will cover the different types of testing and how they interact, breaking apart the usual practice of testing all applications in the same way, the mysterious relationship between speed and confidence, how we were able to throw away the testing pyramid (and watch it burnnnnn!!!) and a number of techniques that have worked well for us when testing our applications.",
              "startsAt": "2015-08-29T14:50:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": false,
              "speakers": [
                {
                  "id": "Rob Moore",
                  "name": "Rob Moore"
                },
                {
                  "id": "Matt Davies",
                  "name": "Matt Davies"
                }
              ],
              "categories": [],
              "roomId": 1,
              "room": "Side Room",
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
        "slotStart": "2015-08-29T15:35:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "sponsor-announcements-and-prize-draw!!!",
              "title": "Sponsor announcements and PRIZE DRAW!!!",
              "description": null,
              "startsAt": "2015-08-29T15:35:00",
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
        "slotStart": "2015-08-29T16:15:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "4ccb057b-c3d1-472a-8ad9-83b9f1e17c14",
              "title": "Why Pointers Still Matter",
              "description": "As computers continue to become faster, and programming languages more powerful and abstract, the question arises: is there still a need for the humble pointer? I will demonstrate why the answer is 'yes', and show some practical scenarios in C# where some basic pointer skills pave the way for simpler and more efficient applications on today's desktops and devices.",
              "startsAt": "2015-08-29T16:15:00",
              "endsAt": null,
              "isServiceSession": false,
              "isPlenumSession": true,
              "speakers": [
                {
                  "id": "Joe Albahari",
                  "name": "Joe Albahari"
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
        "slotStart": "2015-08-29T16:50:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "afterparty",
              "title": "Afterparty",
              "description": null,
              "startsAt": "2015-08-29T16:50:00",
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
        "slotStart": "2015-08-29T19:00:00",
        "rooms": [
          {
            "id": 0,
            "name": "Main Room",
            "index": 0,
            "session": {
              "id": "event-finish",
              "title": "Event finish",
              "description": null,
              "startsAt": "2015-08-29T19:00:00",
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
]
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
                logoUrlDarkMode: '/images/sponsors/2015-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2015-bankwest-light.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Readify',
                logoUrlDarkMode: '/images/sponsors/2015-readify-dark.png',
                logoUrlLightMode: '/images/sponsors/2015-readify-light.png',
                website: 'https://readify.net/',
                quote: undefined,
            },
            {
                name: 'Gooroo',
                logoUrlDarkMode: '/images/sponsors/2015-gooroo-dark.png',
                logoUrlLightMode: '/images/sponsors/2015-gooroo-light.png',
                website: 'https://gooroo.io/',
                quote: undefined,
            },
        ],
    },
}
