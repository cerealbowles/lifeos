# LifeOS — Calm Computing, Adaptive UI & Attention Design Decisions

**Status:** Accepted product direction
**Applies to:** Web UI, PWA, ambient displays, agent behavior, notifications, Feed, prioritization engine
**Purpose:** Establish the interaction philosophy and design principles that differentiate LifeOS from conventional dashboards, productivity applications, and engagement-driven feeds.

> This is the source document as supplied by the user (2026-08-12), kept verbatim for reference —
> the same role `LIFEOS_PRODUCT_ENGINEERING_SPEC.md` plays for the original build spec. The
> numbered ADRs below (027–060 in this document's own numbering) are merged into the canonical
> ledger at [DECISIONS.md](../DECISIONS.md) as ADR-039 through ADR-072 (renumbered to continue
> after the existing ledger rather than collide with it — this document's own ADR-027 is not the
> same decision as DECISIONS.md's ADR-027). See DECISIONS.md for the condensed, cross-referenced
> version integrated with the rest of the project's decisions; see this file for the full
> illustrated rationale and examples.

---

## Design North Star

LifeOS exists to reduce the amount of information the user must personally process.

It should not maximize:

- engagement
- screen time
- information density
- notification volume
- number of visible widgets
- AI interactions
- content consumed

It should optimize for:

- awareness
- clarity
- appropriate attention
- reduced mental load
- timely action
- household coordination
- confidence that important things will surface when necessary

The desired relationship between the user and LifeOS is:

> **LifeOS watches the complexity so the user does not have to.**

The application should earn attention rather than demand it.

---

# ADR-027 — Calm is the default state

## Decision

LifeOS will treat the absence of surfaced information as a successful application state.

The application must not fill available screen space simply because information exists.

A valid and desirable home screen may contain little more than:

```text
Wednesday
August 12


             ◉


      Nothing needs you.


        78° · Sunny

    Next event · 4:30 PM


        Ask LifeOS...
```

This is not an empty state.

It is a **calm state**.

## Rationale

Most software interprets unused screen space as an opportunity to display additional information.

LifeOS takes the opposite position.

If nothing currently deserves the user's attention, the interface should communicate that clearly and then get out of the way.

The reward for having an organized life should not be receiving more information.

---

# ADR-028 — LifeOS will practice calm computing

## Decision

LifeOS will follow a calm-computing philosophy.

Information should generally remain peripheral until it becomes relevant.

The system should transition information through increasing levels of attention:

```text
KNOWN
    ↓
AMBIENT
    ↓
RELEVANT
    ↓
ACTIONABLE
    ↓
URGENT
```

Most information should remain in the first two states.

Only a small percentage should reach the center of the interface.

## Example

A credit card payment may evolve through:

```text
20 days away
KNOWN
Not surfaced.

7 days away
AMBIENT
Visible in Money / Everything.

3 days away
RELEVANT
May appear in Today.

Tomorrow
ACTIONABLE
Appears prominently.

Overdue
URGENT
Escalates.
```

LifeOS should not treat all states equally.

---

# ADR-029 — The interface represents attention spatially

## Decision

LifeOS may use spatial position, scale, contrast, and motion to communicate relevance.

Conceptually:

```text
             peripheral

      RSS                Sports


              ╭─────╮
              │ NOW │
              ╰─────╯


      Garden             Money

              Milo


              important
```

Items may move metaphorically closer to **Now** as relevance increases.

This does not require literal orbital graphics everywhere.

The underlying design principle is:

> **Visual prominence should correspond to current relevance.**

## Possible signals

Higher relevance may produce:

- movement toward the visual center
- increased size
- increased contrast
- expanded detail
- stronger typography

Lower relevance may produce:

- peripheral placement
- reduced contrast
- smaller representation
- grouping
- disappearance

---

# ADR-030 — Life Pulse is the primary global status object

## Decision

LifeOS should explore a persistent visual object representing the current state of the user's world.

Working name:

**Life Pulse**

Conceptually:

```text
              ◉

       Everything is quiet
```

Possible states:

```text
CALM
Nothing requires attention.

ACTIVE
Normal activity exists.

ATTENTION
One or more things should be addressed.

URGENT
Something significant requires timely action.
```

The Pulse should not behave like a notification badge.

It represents **overall attention state**, not unread-item count.

## Interaction

Tapping the Pulse may reveal the reasons for its current state.

Example:

```text
                ◉
              TODAY

          ╱      │      ╲

       Milo    Chase    Storm
       2:30    Friday    6 PM
```

---

# ADR-031 — LifeOS will not use unread counts as its primary attention mechanism

## Decision

Avoid UI patterns such as:

```text
Tasks        17
Feed         42
News         31
Docker        3
Messages      9
```

unless a specific count genuinely helps the user make a decision.

Prefer semantic summaries:

```text
Everything is quiet.
```


```text
2 things need attention.
```


```text
Nothing notable since this morning.
```


```text
One service needs attention.
```

## Rationale

Unread counts create obligation without communicating importance.

LifeOS should communicate **meaning**, not backlog size.

---

# ADR-032 — Completion should restore calm

## Decision

When the user resolves something requiring attention, LifeOS should not automatically replace it with the next-lowest-priority item merely because screen space became available.

Example:

Before:

```text
Attention needed

Milo medication
Due today
```

User completes it.

Preferred:

```text
             ◉

          All done.

     Nothing needs you.
```

Not:

```text
Great!

Now here are seven other things
you could be doing.
```

## Rationale

LifeOS is not an infinite productivity queue.

Completion should create closure.

---

# ADR-033 — The UI will adapt to the rhythm of the day

## Decision

The LifeOS presentation may change according to time and context.

The purpose is not decorative theming.

The purpose is to emphasize information appropriate to the current period.

### Morning

Emphasize:

- today's schedule
- weather
- departures
- significant obligations
- household coordination

### Afternoon

Emphasize:

- next event
- remaining important tasks
- deliveries
- weather changes
- family transitions

### Evening

Emphasize:

- remaining obligations
- sports
- media
- tomorrow preview
- household shutdown routines

### Late evening

Prefer minimal presentation:

```text
Tomorrow

3 things worth knowing.

First event · 9:00 AM

Everything else is quiet.
```

The interface should become visually quieter as the day winds down when circumstances permit.

---

# ADR-034 — LifeOS will use progressive disclosure aggressively

## Decision

The first presentation of an item should contain only enough information to understand its significance.

Example:

```text
Milo
Vet · 2:30 PM
Leave in 42 min
```

Tap:

```text
Milo

Vet appointment
Today · 2:30 PM

Dr. Smith
Oak Park Veterinary Clinic

Reason
Annual checkup

Last visit
August 2025

[Directions] [Details]
```

The underlying repository may contain extensive information.

The primary interface should not expose all of it simultaneously.

---

# ADR-035 — The application itself can become the AI response

## Decision

LifeOS should not assume every AI interaction results in conversational text.

When appropriate, the agent may respond by generating or configuring a structured application view.

Example:

User:

```text
What's this weekend look like?
```

Instead of:

```text
You have several things happening this weekend...
```

LifeOS may present:

```text
              YOUR WEEKEND

SATURDAY                         SUNDAY

72° · Sunny                      68° · Rain

Groceries · morning              Milo medication
Guest bathroom                   Bears · noon

             WORTH KNOWING

Garden watering probably unnecessary.
Rain expected Sunday.

       [Make me a plan]   [Looks good]
```

The UI becomes the answer.

---

# ADR-036 — Generative UI will use controlled primitives

## Decision

AI-generated interfaces must not consist of arbitrary HTML generated by the model.

LifeOS will expose a controlled collection of UI primitives.

Potential primitives:

```text
AttentionCard
EventCard
Timeline
Metric
MetricTrend
Progress
Comparison
Insight
Checklist
WeatherSummary
MediaCard
FeedSummary
SystemStatus
PersonStatus
PetStatus
ActionButton
Section
Grid
Stack
```

The agent may select and compose approved primitives.

Example model output:

```json
{
  "view": "weekend_summary",
  "components": [
    {
      "type": "Timeline",
      "source": "weekend_events"
    },
    {
      "type": "WeatherSummary",
      "source": "weekend_weather"
    },
    {
      "type": "Insight",
      "source": "garden_recommendation"
    }
  ]
}
```

Application code renders the result.

## Rationale

This allows adaptive interfaces while maintaining:

- design consistency
- accessibility
- security
- predictable mobile behavior
- testability

---

# ADR-037 — AI is embedded intelligence, not a chatbot bolted onto LifeOS

## Decision

LifeOS should avoid treating AI as a separate destination whenever possible.

AI may appear through:

- Ask LifeOS
- natural-language Quick Add
- generated summaries
- contextual recommendations
- Feed compression
- grouping related signals
- natural-language search
- adaptive views

A traditional conversation history may still exist, but it is not the defining AI experience.

The goal is:

> **The application feels intelligent rather than merely containing a chatbot.**

---

# ADR-038 — Ask LifeOS is a universal command surface

## Decision

A lightweight Ask LifeOS interaction should be available throughout the application.

Possible requests:

```text
What's happening today?

Anything I need to worry about?

Catch me up.

What's this weekend look like?

Anything broken on the server?

What have we been watching lately?

What's happening with the Cubs?

When did I last change the furnace filter?

Add milk to groceries.

Move bathroom cleaning to Saturday.

Anything interesting going on?
```

The agent determines which domains and tools are relevant.

The user should not need to know where information is stored.

---

# ADR-039 — LifeOS distinguishes obligations from interests

## Decision

LifeOS will maintain a strong conceptual boundary between:

```text
THINGS THAT NEED ME
```

and:

```text
THINGS I MAY ENJOY KNOWING
```

Examples of obligations:

- appointments
- medications
- bills
- important household maintenance
- family logistics
- critical system failures

Examples of interests:

- Reddit
- RSS
- sports news
- music releases
- newly added Jellyfin media
- technology news

Interests generally belong in Feed.

They may be promoted only when context makes them relevant.

---

# ADR-040 — Feed should provide closure, not endless consumption

## Decision

Feed should have natural stopping points.

Preferred:

```text
Since this morning

3 things worth seeing.

[View all]
```

After reviewing:

```text
You're caught up.

Nothing else looks important.
```

Avoid infinite scrolling as the default interaction.

## Rationale

LifeOS should provide the psychological experience of being **caught up**.

Most modern feeds intentionally prevent that state.

LifeOS should intentionally create it.

---

# ADR-041 — LifeOS may learn attention preferences

## Decision

Over time, LifeOS may adapt prioritization using observed user behavior.

Examples:

```text
User almost always opens pet reminders.
→ increase pet-care relevance.

User dismisses routine sports-news signals.
→ reduce sports-news prominence.

Garden information is frequently used April–October.
→ increase seasonal relevance.

Groceries are usually handled Saturday morning.
→ increase shopping relevance then.
```

These adaptations must remain:

- inspectable
- reversible
- bounded
- understandable

The user should eventually be able to see:

```text
LifeOS has learned:

✓ Groceries are usually handled Saturday mornings.
✓ Garden information matters most during growing season.
✓ Sports news rarely needs immediate attention.

[Edit]
```

---

# ADR-042 — Learned behavior must never silently redefine high-impact priorities

## Decision

Personalization may tune low- and medium-priority relevance.

It must not silently suppress important obligations.

For example:

Repeatedly dismissing credit-card reminders must not cause LifeOS to conclude:

```text
User apparently doesn't care about bills.
```

High-consequence categories retain minimum priority floors.

These include:

- financial obligations
- medication
- critical appointments
- severe weather
- safety
- important household/family obligations

---

# ADR-043 — Family coordination is a first-class future capability

## Decision

LifeOS should be designed so the repository can eventually represent multiple household members.

Potential context:

```text
HOUSEHOLD

Alex       Home
Partner    Work
Child      School
Dog        Home
```

The objective is not surveillance.

Presence/context should be:

- explicitly configured
- permissioned
- minimally collected
- used for useful household coordination

Potential insight:

```text
Everyone should be home around 5:45.

Rain begins around 6.

Dinner planned: tacos.

Still needed:
tortillas
```

This is a good example of LifeOS combining several domains into one useful human thought.

---

# ADR-044 — Family data should have explicit ownership and visibility

## Decision

Future multi-user LifeOS data should support visibility levels.

Potential levels:

```text
PRIVATE
Only the individual.

HOUSEHOLD
Shared with household.

SELECTED
Shared with specific members.

SYSTEM
Derived household-level information.
```

An AI agent must respect the same permissions.

The existence of a family repository must not imply that every household member can inspect every other member's data.

---

# ADR-045 — LifeOS supports multiple presentation surfaces

## Decision

LifeOS should not assume one interface works everywhere.

The same repository and Signal system may power different presentation modes.

### Desktop

Purpose:

> Organize and inspect.

Characteristics:

- richer navigation
- history
- configuration
- detailed domain views
- Feed exploration
- management

### Phone/PWA

Purpose:

> Prioritize and act.

Characteristics:

- NOW
- TODAY
- quick actions
- Ask LifeOS
- selective Feed
- minimal navigation

### Ambient Display

Purpose:

> Provide peripheral household awareness.

Potential hardware:

- old iPad
- wall tablet
- kitchen display
- desk display

Characteristics:

- extremely low information density
- large typography
- household context
- current weather
- next meaningful event
- Life Pulse
- minimal interaction

---

# ADR-046 — Ambient Mode is intentionally sparse

## Decision

Ambient Mode should not become a wall-mounted dashboard.

Preferred:

```text
                 4:32

               76° · Sunny


             Dinner · 6:30


              Cubs · 7:05


        Everything else is quiet.
```

When attention is required:

```text
            2 things need attention

             Trash · tonight
          Milo · medication
```

The display should remain useful from a distance and should not continuously demand visual inspection.

---

# ADR-047 — LifeOS should understand household systems without replacing their administration tools

## Decision

LifeOS may consume status from systems such as:

```text
Docker
Jellyfin
Navidrome
Home Assistant
NAS
Pi-hole
Uptime Kuma
backups
network services
```

LifeOS should summarize meaningful state.

Example:

```text
HOME SERVER

● 18 healthy
▲ 1 warning

Immich
Restarted twice · 38 min ago

Storage
68%

Backup
✓ Last night · 2:14 AM
```

LifeOS should not attempt to replace:

- Portainer
- Grafana
- Jellyfin administration
- Navidrome administration
- Home Assistant configuration

unless a future use case clearly justifies it.

---

# ADR-048 — Media is context, interest and action

## Decision

Navidrome and Jellyfin will eventually be eligible LifeOS Sources.

### Navidrome may contribute

- recently played
- favorite artists
- favorite albums
- playlists
- newly added music
- listening patterns

### Jellyfin may contribute

- continue watching
- recently added
- unwatched media
- household viewing activity
- relevant server status

Most media information belongs in Feed.

Context may promote specific media information.

Example:

```text
Friday evening
No remaining obligations
Movie-night routine active
```

LifeOS may surface:

```text
TONIGHT

Continue Severance · S2E4

Recently added
3 movies

[Open Jellyfin]
```

The purpose is to reduce friction, not reproduce Jellyfin.

---

# ADR-049 — Media should support household memory carefully

## Decision

LifeOS may eventually remember useful media context such as:

```text
family movie-night preferences
shared playlists
unfinished shows
favorite artists
recent discoveries
```

Do not infer sensitive personal traits from media consumption.

Media history should remain editable and subject to household visibility permissions.

---

# ADR-050 — LifeOS should deliberately support "Nothing notable"

## Decision

Every aggregation system should be able to return a meaningful zero-result state.

Examples:

```text
Server
Everything healthy.
```


```text
Feed
Nothing notable since this morning.
```


```text
Home
Nothing due.
```


```text
Money
Nothing due soon.
```


```text
Today
Nothing needs you.
```

These are positive outputs.

They should not trigger fallback content merely to occupy the interface.

---

# ADR-051 — Attention is a scarce resource managed by the system

## Decision

LifeOS will treat user attention as a finite resource.

Conceptually, the priority engine has an **attention budget**.

For example, the mobile NOW view may normally permit:

```text
0–5 primary attention items
```

If ten things qualify, LifeOS should:

1. rank them
2. group related items
3. summarize lower-priority items
4. allow deliberate expansion

Example:

Instead of:

```text
Clean bathroom
Vacuum
Clean kitchen
Buy napkins
Buy drinks
Put chairs outside
```

show:

```text
Guests Saturday

3 house tasks
2 shopping items
1 setup task

[Prepare]
```

---

# ADR-052 — Importance and urgency are separate concepts

## Decision

Every attention candidate should distinguish intrinsic importance from temporal urgency.

Example classes:

```text
CRITICAL
Must not miss.

HIGH
Meaningful consequence.

NORMAL
Should be handled.

LOW
Useful but optional.

AMBIENT
Informational.
```

Urgency then modifies the item's current relevance.

Example:

```text
HVAC filter
NORMAL importance
30 days away
→ invisible

HVAC filter
NORMAL importance
due tomorrow
→ Today

Vet appointment
HIGH importance
next month
→ Everything / Upcoming

Vet appointment
HIGH importance
today
→ Now
```

---

# ADR-053 — Context can transform information into attention

## Decision

A Signal's importance is not fixed solely by its source.

Example:

```text
Weather:
82° and sunny
→ Ambient information.
```


```text
Weather:
Thunderstorms during outdoor event
→ Attention.
```


```text
Sports:
Cubs game tonight
→ Today / interest.
```


```text
Sports:
User has tickets and must leave in 30 minutes
→ Now.
```


```text
Jellyfin:
New movie added
→ Feed.
```


```text
Jellyfin:
Movie selected for scheduled family movie night
→ Today.
```

Therefore:

> **The domain does not determine placement. Context determines placement.**

---

# ADR-054 — LifeOS will explain important prioritization decisions

## Decision

For significant recommendations, LifeOS should make the reason understandable.

Example:

```text
Skip watering today

Why?
0.62" rain in the last five days
+ 0.3" expected tonight
```

Example:

```text
Leave by 8:25

Why?
Appointment · 9:00
Travel · ~24 min
5 min buffer
```

This improves trust in both deterministic and AI-assisted recommendations.

---

# ADR-055 — Mindfulness takes precedence over engagement

## Decision

When product goals conflict, choose the design that better protects attention and mental space.

LifeOS will not intentionally optimize for:

- daily active usage
- session length
- Feed consumption
- notification opens
- streaks
- gamified completion
- artificial urgency

Possible success measures are instead:

```text
important events surfaced successfully
missed-obligation rate
unnecessary notifications avoided
time saved
number of sources compressed
percentage of sessions ending in "caught up"
user confidence in prioritization
```

---

# ADR-056 — No productivity guilt

## Decision

LifeOS language should avoid moralizing unfinished work.

Avoid:

```text
You failed to complete 4 tasks.
```

Prefer:

```text
4 tasks remain.
```

Avoid:

```text
You're falling behind.
```

Prefer:

```text
2 routines are overdue.
```

The application reports reality and helps the user act.

It should not manufacture guilt.

---

# ADR-057 — Recommendations should respect human choice

## Decision

LifeOS may recommend actions without pretending its recommendation is objectively correct.

Example:

```text
I'd skip watering today because 0.8" of rain is expected.
```

Allow:

```text
[Skip watering]
[Keep scheduled]
```

User decisions may improve future recommendations.

---

# ADR-058 — The repository is larger than the interface

## Decision

LifeOS may know significantly more than it displays.

The repository may contain:

```text
years of household history
calendar history
routine completions
maintenance records
pet records
measurements
weather history
media history
Feed history
personal facts
semantic memories
system events
```

The interface is a selective lens over this repository.

This distinction is fundamental:

> **Stored does not mean surfaced.**

---

# ADR-059 — LifeOS should create a sense of trust that permits disengagement

## Decision

A long-term product goal is for the user to trust:

> If something important happens, LifeOS will surface it.

This should allow the user to check fewer individual systems.

Instead of repeatedly checking:

```text
Calendar
Weather
Reminders
Banking
Docker
Sports
RSS
Jellyfin
Navidrome
Pet records
```

the user should increasingly trust the LifeOS attention layer.

This trust must be earned through:

- deterministic high-impact rules
- reliable integrations
- transparent recommendations
- conservative suppression
- auditability
- user correction

---

# ADR-060 — The primary LifeOS loop is Observe → Understand → Surface → Act → Settle

## Decision

The product's fundamental interaction loop is:

```text
          OBSERVE
             │
             ▼
        UNDERSTAND
             │
             ▼
          SURFACE
             │
             ▼
            ACT
             │
             ▼
           SETTLE
             │
             └──────────► OBSERVE
```

### Observe

Sources collect or receive information.

### Understand

LifeOS converts data into:

- structured state
- Signals
- derived insights
- relationships
- context

### Surface

The priority engine determines whether anything deserves attention.

### Act

The user or permissioned agent takes an action.

### Settle

Resolved information recedes.

The interface returns toward calm.

This final step is critical.

Traditional software often replaces resolved attention with more content.

LifeOS intentionally **settles**.

---

# Updated Attention Architecture

The current conceptual architecture is:

```text
┌─────────────────────────────────────────────────────┐
│                       SOURCES                       │
│                                                     │
│ Apple · Calendar · Weather · RSS · Reddit · Sports │
│ Docker · Jellyfin · Navidrome · Pets · Finance     │
│ Home · Health · Tasks · Family · Future Sources    │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                PERSONAL REPOSITORY                  │
│                                                     │
│ PostgreSQL · History · Facts · Events · Memories   │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                       SIGNALS                       │
│                                                     │
│ normalized · contextual · time-aware · actionable  │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              ATTENTION ENGINE                       │
│                                                     │
│ Priority · Suppression · Grouping · Context        │
│ Personalization · Attention Budget                 │
└───────────────┬─────────────┬─────────────┬─────────┘
                │             │             │
                ▼             ▼             ▼
              NOW           TODAY          FEED
                │             │             │
                └─────────────┼─────────────┘
                              ▼
                         EVERYTHING
                              │
                              ▼
                       PRESENTATION
                  Desktop · Phone · Ambient
                              │
                              ↕
                         ASK LIFEOS
                              │
                              ▼
                        AGENT + TOOLS
```

---

# Updated Product Mental Model

LifeOS is not an everything dashboard.

It is a **personal and household intelligence layer**.

The repository knows broadly.

The attention engine filters aggressively.

The interface remains calm.

The agent provides access to the depth underneath.

The four primary information layers remain:

```text
NOW
What requires my attention?

TODAY
What is relevant to the current day?

FEED
What is new or interesting in my broader world?

EVERYTHING
What does LifeOS know?
```

And one universal interaction surface:

```text
ASK LIFEOS
Understand, query and act across all of it.
```

---

# Updated Platform Roles

## Desktop

> **Organize my life.**

Deep management, history, configuration and exploration.

## Phone

> **Prioritize my life.**

What matters now, quick actions and context.

## Ambient Display

> **Keep the household quietly aware.**

Peripheral awareness without demanding interaction.

## Agent

> **Understand and act on my life.**

Natural-language access to the repository and permissioned tools.

## Feed

> **Compress my outside world.**

Reduce many external sources into a small number of meaningful updates.

## Repository

> **Remember my life.**

Structured, user-owned history and knowledge independent of any LLM.

---

# UI Direction

LifeOS should avoid looking primarily like:

```text
sidebar
+
12 dashboard cards
+
charts
+
chatbot panel
```

Instead, the primary interface should feel:

- spatial
- adaptive
- calm
- contextual
- responsive to importance
- sparse when appropriate
- alive without being distracting

Permanent navigation and chrome should be minimized on attention-oriented surfaces.

Detailed management surfaces may remain more conventional where conventional UI improves usability.

---

# Motion Principles

Motion should communicate state changes rather than decorate the interface.

Good uses:

```text
An upcoming item gently moves toward prominence.

Completed attention collapses and recedes.

Related signals merge into one insight.

The interface settles after completion.

A detail view expands from its originating object.
```

Avoid:

```text
constant pulsing
decorative floating objects
continuous background animation
attention-seeking transitions
excessive parallax
```

Motion itself consumes attention.

Use it deliberately.

---

# Color Principles

Color should primarily communicate:

- hierarchy
- domain identity when useful
- state
- urgency

Avoid turning every domain into a brightly colored permanent card.

The calm state should use restrained color.

Urgency gains visual distinction precisely because the normal interface is quiet.

---

# Notification Philosophy

A notification represents a decision by LifeOS to interrupt the user.

Therefore every notification should answer:

> Why does this deserve interruption rather than waiting inside LifeOS?

Possible categories:

```text
IMMEDIATE
Requires timely action.

TIME-SENSITIVE
Useful now, less useful later.

DIGEST
Can wait and be grouped.

SILENT
Available inside LifeOS only.
```

Feed content should generally be:

```text
DIGEST
or
SILENT
```

---

# Feed Philosophy

The Feed is not intended to become a destination that competes for hours of attention.

Its ideal output is:

```text
Since this morning:

3 things worth knowing.

Sports
One meaningful update.

Homelab
Everything healthy.

Media
Two things you may enjoy.

RSS
One article looks particularly relevant.

You're caught up.
```

The words:

> **You're caught up.**

represent a successful Feed state.

---

# Family Philosophy

LifeOS should help a household coordinate without turning household members into monitored objects.

The system should favor:

```text
Who needs to know this?
```

over:

```text
What can we track about everyone?
```

Examples of useful household intelligence:

```text
Dinner needs one ingredient.

Everyone should be home before the storm.

The dog's medication hasn't been marked complete.

Movie night is open and three unwatched options are available.

Trash goes out tonight.

The family calendar has a conflict Saturday.
```

---

# AI Philosophy

AI should increase LifeOS's ability to understand complexity while decreasing the complexity presented to the user.

Bad AI outcome:

```text
Here is a 700-word analysis of your Saturday.
```

Better:

```text
Saturday is mostly open.

Three things worth handling:
• groceries
• guest bathroom
• Milo's medication

Rain makes garden work unnecessary.

[Make a morning plan]
```

Best, when appropriate:

LifeOS simply presents the useful structured Saturday view.

---

# Final Design Principle

Before adding any element to the primary LifeOS experience, ask:

1. Does this need the user's attention?
2. Does it need attention **now**?
3. Can several pieces of information be compressed into one thought?
4. Has the user already seen or acknowledged it?
5. Would hiding it make the experience better without creating meaningful risk?
6. Can LifeOS communicate this more calmly?
7. Can the user understand why it surfaced?
8. Will resolving it allow the interface to settle?

If the answers favor silence:

> **Do not show it.**

---

# LifeOS Product Statement

> **LifeOS is a self-hosted personal and family intelligence system designed around calm computing. It maintains a structured repository of the household's important information, observes selected external sources, identifies what deserves attention, compresses everything else, and provides an AI agent for understanding and action.**
>
> **It does not exist to keep the user engaged.**
>
> **It exists so the user can confidently disengage.**

---

# Core Mantra

**Know broadly.**

**Surface selectively.**

**Explain clearly.**

**Act safely.**

**Return to calm.**
