---
title: "DDD Perth Voting 2022 — Avoiding feeling stale(mate)"
date: 2022-04-11
authors:
    - Aidan Morgan
summary: "Please don’t ask me to play chess, I’m very bad at it."
legacyPaths:
    - /ddd-voting-2022-avoiding-feeling-stale-mate-cfb0a15db37b
    - /p/cfb0a15db37b
---

![A black and white photo of two chess knights on a chessboard facing each other.](/images/blog/2022-04-11-ddd-voting-2022-avoiding-feeling-stale-mate/01.jpeg)

*Image credit: [@hpzworkz](https://unsplash.com/@hpzworkz) on [Unsplash](https://unsplash.com/photos/7SjEuEF06Zw)*

One of the core tenants of DDD Perth is that the agenda for the conference is chosen democratically, by the attendees. From humble beginnings where we could barely fill a whole day’s conference, DDD Perth now garners over 150 submissions a year, and whittling that down to a conference of \~30 talks presents its own challenges.

For 2022, we’re trying something different… and I’d like to take this opportunity to outline why we made this decision and, just for something a little different, give you a simple introduction to competitive Chess.

## **A brief history of DDD Perth voting**

In the early days of DDD, we allowed people to vote for the 10 talks they most wanted to see and would then take the \~30 talks that had the highest level of votes. This ensured that we had the talks most relevant to attendees, but came with a downside — the talks didn’t necessarily represent the breadth of topics we hoped to see at the conference. Given the majority of attendees identify as some type of “developer,” the bulk of the talks were developer oriented, overlooking other interesting insights from themes such as design or data. Makes sense, but not ideal, we could do better.

In 2019/2021, we changed the voting process to ask attendees to rank the talks that they most wanted to see, trying to make sure that we got as many first choices of attendees rather than just going with the “majority” wins approach. This definitely improved the diversity of themes that were presented on the day, but introduced some unintended challenges for voting that we hope to address for this year.

For those of you that are interested in the math and algorithms behind how we did the voting for 2019/2021, Wikipedia is a good starting point for topics such as [Condorcet Methods](https://en.wikipedia.org/wiki/Condorcet_method), [Ranked Pairs](https://en.wikipedia.org/wiki/Ranked_pairs) (the 2019 approach), and [Schulze Method](https://en.wikipedia.org/wiki/Schulze_method) (the 2021 approach). Yes I know I need a hobby; esoteric election and ranking algorithms are a *very niche* interest of mine.

## **Challenges identified from 2019 and 2021**

The committee is committed to resolving the following challenges that we identified from previous years for the 2022 agenda selection.

### **Too much reading! Too much time!**

With 150–200 CFP responses, using a ranked preferential voting method meant that attendees had to read 150–200 abstracts to determine the 10 talks that they wanted to vote for. This is a significant amount of reading and caused a significant drop off in votes submitted, meaning that we weren’t necessarily hitting the mark on the democratic ideal.

![Padme face meme. “I am going to vote on my favourite talks”, “after reading all 150 submissions, right?”](/images/blog/2022-04-11-ddd-voting-2022-avoiding-feeling-stale-mate/02.jpeg)

*All credit for this meme goes to [Cairolikethecity](https://medium.com/u/ee1032435be6), I’m just kept around for the algorithms.*

### **Choosing 10 talks was hard**

The addition of the shortlisting feature to the voting process allowed attendees to tag talks that they were interested in, filtering the list before selecting the 10 they wanted to see. Voluminous and sometimes very vocal feedback told us that it was next to impossible to whittle the shortlist down to “just 10” talks, we even got asked by one person *“can I please have 11 votes, I can’t choose”*.

### **Ranking 10 talks was even harder**

Whilst fans of [Antony Green](https://twitter.com/AntonyGreenElec) are familiar with [instant runoff voting](https://en.wikipedia.org/wiki/Instant-runoff_voting) from federal and state elections, it turns out that when trying to determine a preferred conference lineup, we weren’t comparing apples and oranges and a lot of attendees struggled to be able to rank their shortlist (assuming they were able to whittle it down to 10 entries in the first place). A lot of feedback requested the ability to have *“more than one number one”*.

## **So what are we doing differently in 2022?**

Given these voting challenges, this year in 2022 we are using a model that the committee have nicknamed *Tinder for CFP.*

Voting for talks will now present you with two talk abstracts, asking you to select one or the other (or neither). Then you’ll be shown another pair to choose from. Then another. Rinse, repeat .…. forever….. or until voting closes.

![A design mockup showing the new voting concept with two talks presented side-by-side with a “pick me” option under each.](/images/blog/2022-04-11-ddd-voting-2022-avoiding-feeling-stale-mate/03.png)

*A very-early alpha version mockup of how voting for two randomly selected talks from 2021 would look with the new voting system — the titles were chosen at random by our API.*

We believe that this approach will overcome the challenges attendees faced in 2019/2021 by:

- Reducing the amount of reading to only two abstracts at a time rather than reading every abstract before making choices (no longer risking disappointing Padmé)
- Removing the need to rank abstracts, making it a simple “this or that” (or neither) choice
- Removing the limitation of only voting for 10 talks, you can vote as little (or as much) as you feel

## **So how does it work?**

The new voting system uses the same algorithm that is used to rank competitive Chess players known as the [Elo rating system](https://en.wikipedia.org/wiki/Elo_rating_system), with some DDD specific tweaks.

There are many uses of the Elo rating system outside of chess, it is actually the secret behind how [Tinder works](https://web.archive.org/web/20170819190821/https:/killscreen.com/articles/tinder-matchmaking-is-more-like-warcraft-than-you-might-think/) (hence the nickname), rank competitive Starcraft 2 games, and is used for predicting the [outcomes of Roller Derby](http://flattrackstats.com/about/algorithm/detailed) games.

Simply put, each talk is given a relative strength score based on how it compares with other talks — when we have two talks shown side by side, the chosen talk’s strength score improves by a factor of the difference in strength between the two (choosing neither option has no affect on the scores).

This is an overly simplistic explanation to avoid going into the math; if you *are* interested in the math, [then this awesome post by](https://mattmazzola.medium.com/understanding-the-elo-rating-system-264572c7a2b4) [Matt Mazzola](https://medium.com/u/1cc4d108ec8e) is a good place to start your journey into the wonderful world of Elo.

Using an Elo approach allows the talks that are more popular to get high strength scores (and be included in the conference agenda) and talks that are less popular to drop out of consideration.

One difficulty in using Elo for ranking talks for an agenda is that these ratings have an implied time-component (that is, a score is a product of the head-to-head matches up to that point in time), something that doesn't work for a one-shot voting period such as DDD Perth. We control for this by taking the raw vote data and running 1,000,000 different voting periods with the order of the votes randomly shuffled, producing 1,000,000 hypothetical samples (an approximation technique known as a [Monte Carlo Method](https://en.wikipedia.org/wiki/Monte_Carlo_method)).

To compute a talk’s final ranking for inclusion in an agenda, we assign a point value (based on a simple exponential model) to the talk’s score in each sample and then take the [statistical mode](https://en.wikipedia.org/wiki/Mode_%28statistics%29) of the point values for all samples. This final ranking by points allows us to have confidence that the overall rank of the talk closely matches the theoretically ideal ranking based only on the votes we have received.

Et voilà — using some creative thinking and just a little bit of math that is [easily done in Excel](https://twitter.com/arggrande/status/1293362365547728896) we have a conference agenda for 2022!

## **In Conclusion**

We hope that this year’s voting experience is an improvement over past voting, but we are always open to feedback on how we can improve. We will continue to monitor the analytics we have built into our platform, and as always we love feedback from the community to help ensure we meet our goal of a democratically chosen agenda.

Lastly, please don’t ask me to play Chess, I am **very** bad at it. I did however love watching [The Queens Gambit](https://en.wikipedia.org/wiki/The_Queen%27s_Gambit_%28miniseries%29) multiple times during locky-d 2020.
