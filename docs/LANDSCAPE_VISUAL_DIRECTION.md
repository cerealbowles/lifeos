# LifeOS — Decisions (Landscape Visual Direction)

**Status:** Accepted product direction
**Applies to:** Visual system, Web UI/PWA, Today, Home, Health, Grow, Journal/Moments, navigation
**Purpose:** Reconcile the earth/landscape visual prototype direction with the existing calm-computing philosophy — keep the environmental visual language, explicitly drop everything gamification-shaped (Focus Score, streak grids, numeric Life Pulse).

> This is the source document as supplied by the user (2026-08-26), kept verbatim for reference —
> the same role `CALM_COMPUTING_DECISIONS.md` plays for the calm-computing direction. The
> numbered ADRs below (104–120 in this document's own numbering) are merged into the canonical
> ledger at [DECISIONS.md](../DECISIONS.md) as ADR-109 through ADR-125 (renumbered to continue
> after the existing ledger rather than collide with it — this document's own ADR-104 is not the
> same decision as DECISIONS.md's ADR-104, which predates this doc and covers unrelated backdrop
> motion work). See DECISIONS.md for the condensed, cross-referenced version integrated with the
> rest of the project's decisions; see this file for the full rationale, examples, and the
> complete visual system spec (palette, environmental model, per-screen design direction).

---

# LifeOS — Decisions

**Canonical product/design direction for the next phase of LifeOS.**

This document updates the existing LifeOS decision ledger in response to the recent visual prototype work. It does **not** invalidate the core calm-computing decisions already established in ADR-039 through ADR-072. Instead, it translates those principles into a clearer visual/product direction.

The existing ADR ledger remains the source of truth for previously decided architecture and implementation behavior. The decisions below are the **new direction from ADR-104 onward**.

---

## How to read this document

The current LifeOS philosophy remains:

- LifeOS is a selective lens over a much larger repository of personal information.
- Today is a synthesized, ranked view rather than a generic dashboard.
- The absence of surfaced information is a successful state.
- Information moves through `KNOWN → AMBIENT → RELEVANT → ACTIONABLE → URGENT`.
- Completion should restore calm rather than backfill the freed space.
- LifeOS should help the user disengage rather than maximize engagement.
- The product loop is `Observe → Understand → Surface → Act → Settle`.

These principles are explicitly retained.

The new work is primarily about **how that philosophy should feel and look**.

---

# Product Direction

## ADR-104: LifeOS is a landscape, not a dashboard

**Status:** Adopted

**Decision:** The primary visual metaphor for LifeOS is a **landscape of the user's life**, not a productivity dashboard.

LifeOS should feel like an environment the user enters briefly to understand the state of their life and then leave.

The visual system should draw from:

- earth
- forest
- mountains
- stone
- clay
- moss
- copper
- natural light
- weather
- seasons
- time-of-day cycles

This metaphor should remain subtle. LifeOS is **not** a nature/wellness app.

**Reason:** The visual prototype showed that the environmental concept gives the product a distinctive identity while supporting the existing calm-computing philosophy. The environment provides visual richness without requiring the interface to constantly surface more information.

---

## ADR-105: Dark mode remains the primary visual foundation

**Status:** Adopted

**Decision:** LifeOS remains a dark-mode-first product.

The new earth-centric direction is **not** a conversion to a beige/light interface.

The base should be:

- warm near-black
- deep brown
- charcoal-green
- dark stone

with restrained accents from:

- moss
- olive
- clay
- copper
- warm gold
- parchment

Avoid:

- pure black
- pure white
- neon green
- bright Material colors
- generic blue productivity UI

**Reason:** The dark foundation preserves the original ambient quality while allowing the earth palette to become the identity of the product.

---

## ADR-106: The environment changes; the interface remains familiar

**Status:** Adopted

**Decision:** Time of day, weather, and eventually season may influence the environmental presentation of LifeOS without causing the underlying interface to change dramatically.

The environment may transition between:

- dawn
- morning
- afternoon
- golden hour
- dusk
- night

The interface should remain recognizable across these states.

**Reason:** This preserves the original ambient/time-of-day concept while making it feel connected to the natural world rather than simply switching between themes.

The principle is:

> **The world changes. The interface stays familiar.**

---

## ADR-107: Home is the environmental overview

**Status:** Adopted

**Decision:** Home should be the most immersive LifeOS surface.

Home answers:

> **"What is the state of my life right now?"**

It should not attempt to display every domain or metric.

A preferred hierarchy is:

```text
ENVIRONMENT
    ↓
LIFE PULSE / CURRENT STATE
    ↓
WHAT NEEDS YOU
    ↓
TODAY
    ↓
OPTIONAL CONTEXT
```

When nothing important needs attention, Home should be allowed to remain sparse.

A calm Home state might contain only:

- environmental scene
- greeting
- time/date
- weather
- calm-state message
- minimal Today context

It should **not** automatically fill unused space with statistics.

**Reason:** This directly applies ADR-039, ADR-043, ADR-044, and ADR-070 to the visual redesign.

---

## ADR-108: Life Pulse is the primary synthesis mechanism, not a score

**Status:** Adopted direction

**Decision:** Life Pulse should be treated as a **semantic attention state**, not a numerical health/productivity score.

The existing conceptual states remain:

- `CALM`
- `ACTIVE`
- `ATTENTION`
- `URGENT`

Life Pulse should answer:

> **"Does anything need my attention?"**

Examples:

```text
Everything is quiet.
```

```text
2 things need your attention.
```

```text
One appointment is approaching.
```

```text
Something needs you now.
```

Avoid presenting Life Pulse as:

- 82/100
- productivity score
- life score
- daily score
- "performance"

The reasons behind the state should be available on interaction.

**Reason:** This strengthens the exploratory ADR-042 and follows ADR-043's preference for semantic summaries over raw counters.

---

## ADR-109: LifeOS may visualize progress without gamifying behavior

**Status:** Adopted

**Decision:** LifeOS will **not** intentionally optimize for streaks, XP, levels, badges, leaderboards, daily engagement, or session length.

However, LifeOS may visualize **real progression and accumulated change** when that information is useful to the user.

Examples:

- habit consistency over time
- workout history
- reading progress
- garden growth
- financial progress
- health trends
- completed milestones
- long-term patterns

The visual language should emphasize:

> **growth, history, rhythm, and reality**

rather than:

> **reward, competition, obligation, and engagement**

**Reason:** The visual prototypes revealed that progression and completion can make the interface more satisfying without requiring gamification. This is compatible with ADR-067 as long as the visualization does not manufacture engagement pressure.

### Explicitly avoid

```text
🔥 14 day streak!
+250 XP
Level 7
Don't break your streak!
Complete today's goal
You're falling behind
```

### Prefer

```text
11 of 14 days this month
```

```text
Your activity has increased over the last 6 weeks.
```

```text
3 routines are established.
```

```text
Garden: 4 plants growing
```

The system should describe reality rather than judge it.

---

## ADR-110: Growth belongs in the Grow domain, not in global attention

**Status:** Adopted direction

**Decision:** Progress-oriented visualizations should generally live within appropriate domains, especially Grow, Health, and historical views, rather than becoming a persistent global score.

Grow can express:

- habits
- routines
- long-term consistency
- projects of personal development
- plants/garden growth
- milestones
- accumulated progress

Home should not become a "how well are you doing?" dashboard.

**Reason:** This preserves the distinction between **attention** and **development**.

Life Pulse tells the user what needs attention.

Grow tells the user what has developed over time.

Those are different concepts and should not be merged.

---

## ADR-111: Completion should make the interface quieter

**Status:** Adopted

**Decision:** Completion is a transition toward calm.

When the user completes something important:

1. resolve it
2. remove or de-emphasize it
3. recompute attention
4. allow the surface to become quieter

Do not automatically replace completed items with lower-priority work solely to keep the screen full.

This is the visual expression of ADR-044 and ADR-072.

A successful end state is:

```text
Nothing needs you.
```

not:

```text
Great! Now complete these 6 things!
```

---

## ADR-112: Home and Today have different jobs

**Status:** Adopted

**Decision:**

### Home

Home is:

> **ambient + synthesized + environmental**

It communicates the state of the user's life.

### Today

Today is:

> **focused + operational + actionable**

It communicates what matters today.

Home should not become a second Today page.

Today should not become an immersive landscape that hides actionable information.

**Reason:** The visual prototype showed that the immersive Home concept and the structured Today concept complement each other rather than compete.

---

## ADR-113: Today remains the primary UX anchor

**Status:** Retained and visually reinforced

**Decision:** Today remains the primary UX surface.

The mobile navigation decision from ADR-085 remains:

- Today occupies the geometric center.
- Other slots are customizable.
- Today receives distinct visual treatment.

The visual treatment should make Today feel like the **anchor of the system**, not a gamified reward button.

The center navigation element should communicate:

> **"This is where I orient myself."**

not:

> **"This is where I earn my daily progress."**

---

## ADR-114: The visual system should be material, not card-heavy

**Status:** Adopted

**Decision:** LifeOS surfaces should feel physical and grounded rather than like generic Material 3 cards.

Visual references include:

- stone
- paper
- clay
- wood
- frosted natural glass

Use:

- subtle tonal variation
- soft shadows
- restrained translucency
- subtle texture where appropriate
- rounded but controlled geometry

Avoid:

- every datum becoming a floating card
- excessive borders
- excessive glassmorphism
- large shadows
- bright outlines
- decorative UI without informational purpose

The goal is:

> **physical rather than digital**

---

## ADR-115: Nature is an environmental language, not decoration

**Status:** Adopted

**Decision:** Nature elements should primarily communicate environment, time, season, and context.

Appropriate:

- mountain silhouettes
- forests
- moon/sun
- clouds
- atmospheric haze
- seasonal vegetation
- topographic forms
- subtle natural textures

Avoid turning every feature into:

- leaves
- plants
- botanical icons
- literal nature metaphors
- decorative illustrations

The user should feel:

> **"This feels alive."**

not:

> **"This is a nature-themed app."**

---

## ADR-116: Ambient motion must remain subordinate to attention

**Status:** Adopted

**Decision:** Environmental motion may be used, but it must remain subtle and subordinate to the user's attention.

Good uses:

- slow environmental transitions
- sun/moon movement
- extremely subtle cloud movement
- gentle parallax
- restrained state transitions

Avoid:

- constant particle effects
- animated backgrounds that compete with content
- excessive spring animations
- decorative motion with no informational purpose

This preserves the calm-computing principles already established around motion and Ambient Mode.

---

## ADR-117: Color communicates attention, not domain ownership everywhere

**Status:** Retained and extended

**Decision:** The restrained-color principle from ADR-073 remains.

Normal LifeOS surfaces should be visually quiet.

Color intensity should increase when something becomes more relevant.

The attention ladder should therefore have a visual expression:

```text
KNOWN
quiet / nearly invisible

AMBIENT
subtle environmental or domain indication

RELEVANT
slightly increased contrast

ACTIONABLE
clear visual distinction

URGENT
strongest restrained accent
```

Do not make every domain permanently vivid.

Urgency should be visually meaningful because normal UI is quiet.

---

## ADR-118: Raw counts are not the primary Home language

**Status:** Adopted

**Decision:** Home should prefer semantic summaries over raw counters.

Avoid:

```text
17 Tasks
14 Games
6 Habits
3 Messages
```

Prefer:

```text
Everything is quiet.
```

```text
2 things need attention.
```

```text
A few things are coming up this afternoon.
```

```text
Nothing notable since this morning.
```

Raw counts remain appropriate inside detailed domain views when they help the user understand data.

**Reason:** This applies ADR-043 more consistently to the redesigned Home.

---

## ADR-119: Progressive disclosure remains a core visual rule

**Status:** Retained

**Decision:** The first presentation of an item should contain only enough information to understand its significance.

Summary:

```text
Milo · Vet · 2:30 PM · Leave in 42 min
```

Detail:

```text
vet name
address
history
notes
attachments
etc.
```

Do not let the new visual language become an excuse for information density.

Beauty and calm should coexist with progressive disclosure.

---

## ADR-120: The interface is a selective lens, not a mirror

**Status:** Retained and reinforced

**Decision:** LifeOS may know substantially more than it displays.

The repository can contain:

- events
- history
- routines
- measurements
- financial information
- pets
- calendar data
- sports
- weather
- moments
- notes
- long-term memory

None of that implies it belongs on Home.

The design question for every item is:

> **"Does this deserve attention here, right now?"**

not:

> **"Can we display this?"**

This is ADR-070 applied as a design review rule.

---

# Visual System

## Core palette

Starting palette:

```text
Background / Night    #0F0F0C
Deep Surface          #171611
Surface               #211F19
Stone                 #302A22
Dark Moss             #414633
Moss                  #5A6040
Olive                 #73744A
Clay                  #875435
Copper                #A66B45
Warm Gold             #C29563
Parchment             #D8C7AA
Muted Text            #9D9585
Primary Text          #E8DDC9
```

These are starting values, not immutable specifications.

The palette should remain:

- dark
- warm
- muted
- earthy
- restrained

---

# Environmental Model

A reusable environmental model should be established.

```kotlin
enum class DayPhase {
    DAWN,
    MORNING,
    AFTERNOON,
    GOLDEN_HOUR,
    DUSK,
    NIGHT
}
```

Possible environmental layers:

```text
sky
↓
clouds
↓
distant mountains
↓
near mountains
↓
forest
↓
foreground
↓
interface
```

Weather and season may influence the environment later.

The environment should remain a presentation layer over the same underlying LifeOS data.

---

# Home Design Direction

The Home screen should generally follow this hierarchy:

```text
                    LIFEOS

              Good evening

             [environment]

              LIFE PULSE

           Everything is quiet.

                 TODAY

          Dinner with Sarah     7:00
          Gym                   8:30
          Garden                Tomorrow
```

When attention exists:

```text
              LIFE PULSE

          2 things need you

       Vet appointment
       Leave in 38 minutes

       Package delivery
       Arriving today

                 TODAY
```

The exact layout is not fixed.

The hierarchy is.

---

# Today Design Direction

Today should use a structured header and clear date context.

Example:

```text
←                  Today                  ⋯
                     June 18

     MON   TUE   WED   THU   FRI   SAT   SUN

                       ●

                    TODAY
```

Today should prioritize:

1. NOW
2. TODAY
3. context that helps execution
4. calm confirmation when nothing remains

It should not become an infinite task queue.

---

# Health Design Direction

Health is an analytical domain.

It may use richer visualizations than Home, including:

- trends
- measurements
- workouts
- sleep
- recovery
- activity

The visual language can become more organic:

- moon arcs for sleep
- path-like activity trends
- environmental recovery indicators
- restrained charts

These are visual metaphors, not scores.

Health should never reduce the user's body to a single "performance" number.

---

# Grow Design Direction

Grow is the preferred home for long-term progression.

It may visualize:

- consistency
- habits
- routines
- milestones
- garden growth
- long-term development

The visual language can include:

- growth
- rings
- paths
- seasons
- accumulated history
- organic charts

Avoid XP, levels, streak pressure, and competitive mechanics.

---

# Journal / Moments Design Direction

Journal and Moments should be quiet and reflective.

The earth/material palette can become softer here:

- parchment-like surfaces
- subtle texture
- warm typography
- subdued environmental imagery

The purpose is reflection and memory, not engagement.

---

# Navigation

Retain ADR-085:

- Today is fixed in the center.
- Other mobile slots are customizable.
- Settings is outside the primary bottom navigation.

The new visual treatment should emphasize Today as the orientation point of the application.

---

# Prototype Principles

The next visual prototype should answer these questions:

1. Does Home feel like entering a living environment?
2. Does the environmental layer make the product distinctive?
3. Does Home remain calm when there is nothing important to surface?
4. Does Life Pulse communicate state without becoming a score?
5. Does Today remain operational and easy to act on?
6. Does progress feel satisfying without becoming gamification?
7. Does Grow provide a place for long-term development?
8. Does completion make the interface quieter?
9. Does the visual hierarchy communicate the attention ladder?
10. Does the interface still feel like LifeOS when the nature imagery is removed?

---

# Explicit Non-Goals

LifeOS is not becoming:

- a game
- a habit-streak app
- a wellness score
- a quantified-self leaderboard
- a dopamine dashboard
- a nature/wellness brand
- a generic Material 3 dashboard
- an infinite productivity queue

The product should not intentionally maximize:

- daily active usage
- session length
- notifications
- streak preservation
- task completion for its own sake

The goal remains:

> **help the user understand what matters, act when necessary, and return to life.**

---

# Design Tie-Breaker

When two visual/product decisions conflict, use this order:

1. **Protect attention**
2. **Make important information legible**
3. **Preserve user agency**
4. **Reduce unnecessary interaction**
5. **Support the Observe → Understand → Surface → Act → Settle loop**
6. **Maintain visual calm**
7. **Use environmental/natural language**
8. **Add delight only when it does not compete with the above**

---

# The Core Idea

The visual redesign should not replace the original LifeOS philosophy.

It should give that philosophy a physical identity.

> **The landscape is what makes LifeOS beautiful.**
>
> **The attention system is what makes it useful.**
>
> **Growth is something LifeOS can show, not something it should demand.**
>
> **Completion should make the world quieter.**
>
> **The ultimate success state is that the user trusts LifeOS enough to stop checking it.**
