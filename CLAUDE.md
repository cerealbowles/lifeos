# LifeOS — Claude Development Instructions

LifeOS is a self-hosted personal-life operating system.

Before making architectural changes, read:

- `PRODUCT.md`
- `UX_PRIORITIZATION.md`
- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `ROADMAP.md`

## Core product model

LifeOS should not try to show everything at once.

The product has three layers of information:

1. **NOW** — the small number of items that deserve immediate attention.
2. **TODAY** — everything reasonably relevant today.
3. **EVERYTHING** — the full underlying LifeOS data model and modules.

The desktop/web application primarily **organizes the user's life**.

The mobile/PWA interface primarily **prioritizes the user's life**.

The AI agent primarily **lets the user query and act on their life**.

## Critical UX principle

Domains should compete for attention, not permanent screen space.

Do not create a mobile dashboard with a fixed card for every module.

If pets have nothing relevant today, do not show a Pets card.

If finances have nothing relevant today, do not show a Money card.

If weather materially changes the user's plans, Weather may become one of the most prominent items.

## Prioritization

Items surfaced on the mobile home screen should eventually be ranked using deterministic signals such as:

- urgency
- importance
- actionability
- exception/unusual state
- current context
- user preference

Do not delegate core priority ranking entirely to an LLM.

Use explicit application logic first.

The LLM may later help:

- summarize related items
- group records into a human-readable insight
- interpret ambiguous user intent
- generate suggestions

## Suppression is a feature

LifeOS should decide what **not** to show.

Avoid resurfacing information when:

- nothing changed
- no action is needed
- it is too far away
- the user already acknowledged it
- it was recently surfaced
- a higher-level insight supersedes it

Avoid notification fatigue.

## Data ownership

The application database is the source of truth.

The LLM is not long-term storage.

Personal facts, history, routines, events, and measurements belong in the database.

The AI should only receive relevant context for the current request.

## AI architecture

The agent should use permissioned application tools.

Do not give the LLM unrestricted database access.

The model provider must remain replaceable.

Do not couple domain logic directly to Claude, OpenAI, Anthropic, Ollama, or another vendor.

## Development philosophy

Prefer:

- simple architecture
- modular monolith
- manual workflows before difficult integrations
- deterministic domain logic
- explicit permissions
- mobile-friendly UI
- functionality without AI

Avoid:

- premature microservices
- excessive abstraction
- giant static dashboards
- AI-first architecture
- storing personal facts in model prompts
- building every integration at once

## Current product priority

Build a useful core before expanding integrations.

Initial focus:

- tasks
- recurring routines
- lists
- pets
- weather
- lightweight financial reminders
- Today view
- prioritization engine
- later: agent layer
- later: Apple/iPhone bridge
- later: HealthKit and deeper integrations

## Working process

When starting a task:

1. Inspect the existing implementation.
2. Read the relevant project docs.
3. Identify the smallest coherent increment.
4. Implement it.
5. Run tests, lint, type checks, and build where practical.
6. Fix failures before stopping.
7. Update documentation if the implementation changes architectural assumptions.

Do not ask for approval on routine coding choices.

Ask only when a decision materially affects:

- security
- privacy
- deployment
- data loss
- foundational architecture
- significant external cost