# Product

LifeOS is a self-hosted personal and household intelligence system designed around **calm
computing**. It maintains a structured repository of the household's important information,
observes selected external sources, identifies what deserves attention, compresses
everything else, and provides an AI agent for understanding and action.

> **It does not exist to keep the user engaged. It exists so the user can confidently
> disengage.**
>
> — LifeOS Product Statement, DECISIONS.md ADR-039–072 (2026-08-12 calm-computing direction)

It is not trying to replace every source system. It's a **personal control plane** over the
user's life — organized around what matters now, not around source apps.

Full detail: [docs/LIFEOS_PRODUCT_ENGINEERING_SPEC.md](docs/LIFEOS_PRODUCT_ENGINEERING_SPEC.md)
(original build spec), [docs/CALM_COMPUTING_DECISIONS.md](docs/CALM_COMPUTING_DECISIONS.md)
(the calm-computing/attention-design direction, illustrated in full), and
[docs/LANDSCAPE_VISUAL_DIRECTION.md](docs/LANDSCAPE_VISUAL_DIRECTION.md) (the earth/landscape
visual system — dark, warm, material surfaces, environmental time-of-day tinting — that gives
the calm-computing philosophy a physical identity, DECISIONS.md ADR-109–125). This doc is the
short, synthesized version of all three, kept current as the product evolves.

## Design North Star

LifeOS exists to reduce the amount of information the user must personally process. It should
not maximize engagement, screen time, information density, notification volume, widget count,
AI interactions, or content consumed. It should optimize for awareness, clarity, appropriate
attention, reduced mental load, timely action, household coordination, and confidence that
important things will surface when necessary.

> **LifeOS watches the complexity so the user does not have to.**

The application should earn attention rather than demand it.

## The four layers

1. **NOW** — the small number of items that deserve immediate attention.
2. **TODAY** — everything reasonably relevant today.
3. **FEED** — what's new or interesting in the user's broader world (RSS, sports news, and
   similar interest content) — see ADR-020/ADR-024/ADR-039/ADR-051: interests are
   conceptually and visually separate from obligations, so they never compete with NOW/TODAY
   for the same attention.
4. **EVERYTHING** — the full underlying data model and modules, reachable via navigation.

Plus one universal interaction layer, **Ask LifeOS**, to query, understand, summarize, and
act across all four.

The desktop/web app primarily **organizes** the user's life (browse into any module).
The mobile/PWA interface primarily **prioritizes** the user's life (surface what matters).
The Feed **compresses** the user's outside world down to what's actually worth knowing.
The AI agent primarily lets the user **query and act** on their life.
A future Ambient Display would primarily keep the household **peripherally aware** without
demanding interaction (not built yet — DECISIONS.md ADR-057/058).

See [UX_PRIORITIZATION.md](UX_PRIORITIZATION.md) for how NOW/TODAY is actually computed.

## Core principles

- **The database is the source of truth.** Pet names, chore schedules, bill due dates — none
  of it lives in a model prompt. The LLM gets only the context relevant to one request.
- **AI operates through permissioned tools, never raw database access.** See DECISIONS.md
  ADR-005.
- **Suppression is a feature.** LifeOS decides what *not* to show — nothing changed, nothing
  actionable, too far away, already acknowledged. A domain with nothing relevant today
  renders no card at all (DECISIONS.md ADR-011).
- **Manual input first, integrations second.** A credit card due date typed in by hand is
  useful immediately; waiting for a bank integration to ship first is not.
- **Privacy is foundational.** Self-hosted, minimal external transmission, an eventual AI
  action audit log, and full user visibility into anything the AI remembers about them.

## Initial scope

Today dashboard, calendar, tasks + recurring routines, lists, weather/rainfall, pets,
lightweight financial reminders, sports, RSS Feed, manual measurements, AI chat, personal
memory. See [ROADMAP.md](ROADMAP.md) for what's actually built versus still ahead.

Explicitly **not** in scope yet: bank transaction aggregation, full budgeting, Apple Health
integration, email ingestion, smart-home automation, multi-user households, automatic
purchasing, autonomous financial actions, Life Pulse, Ambient Display, generative UI,
personalization/learned preferences, and media (Navidrome/Jellyfin) Sources — all accepted
future direction per DECISIONS.md ADR-039–072, none built yet.

## Non-goals

LifeOS should never become: a generic project-management tool, a Notion clone, a finance app,
a fitness app, a smart-home platform, a social network, or "an LLM chatbot with a few
plugins bolted on." It should also never become an engagement-optimized product — no streaks,
no gamified completion, no artificial urgency, no infinite scroll, no unread-count badges as
the primary way of communicating that something needs attention (DECISIONS.md ADR-043,
ADR-067).

## Final design principle

Before adding any element to the primary LifeOS experience, ask:

1. Does this need the user's attention?
2. Does it need attention **now**?
3. Can several pieces of information be compressed into one thought?
4. Has the user already seen or acknowledged it?
5. Would hiding it make the experience better without creating meaningful risk?
6. Can LifeOS communicate this more calmly?
7. Can the user understand why it surfaced?
8. Will resolving it allow the interface to settle?

If the answers favor silence: **do not show it.**

## Success criteria

The product succeeds if the user develops the habit of opening LifeOS before opening six
other apps — and if the AI assistant reduces interaction cost further: instead of navigating
the application, ask it. More precisely, per the calm-computing direction: success looks like
sessions that end in "you're caught up," not sessions that run long — missed-obligation rate,
unnecessary notifications avoided, and user confidence in prioritization matter more than
time spent in the app.

## Core mantra

**Know broadly. Surface selectively. Explain clearly. Act safely. Return to calm.**
