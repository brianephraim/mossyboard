# UX Spec Meta-Plan

## Goal

Create one precise UX specification document that can act as the source of truth for:

- [ ] an AI UX wireframe design agent
- [ ] an AI frontend coding agent
- [ ] an AI backend coding agent

The UX spec should describe product behavior clearly enough that downstream agents do not need to invent important details.

---

## Why this exists

This repo already has platform foundations, but it does not yet have feature-specific Kanban UX defined in implementation-ready detail.

Use this workflow to go from:

- [ ] product intent
- [ ] repo constraints
- [ ] open assumptions

to:

- [ ] a canonical UX spec
- [ ] a wireframe brief
- [ ] a frontend implementation brief
- [ ] a backend implementation brief

---

## Inputs to gather before prompting

Always give the UX-spec-authoring agent these inputs first:

- [ ] [`AGENTS.md`](../AGENTS.md)
- [ ] [`docs/kanban-app-requirements.md`](./kanban-app-requirements.md)
- [ ] [`docs/app-architecture-overview.md`](./app-architecture-overview.md)
- [ ] `package.json` so the agent can see the current frontend dependency baseline
- [ ] any existing screenshots, sketches, or reference products
- [ ] the specific feature slice being defined

The agent should treat those files as constraints, not inspiration only.

When library APIs or package fit are uncertain, use current official docs/examples before recommending a frontend dependency.

---

## Output set

The workflow should end with six concrete artifacts:

1. A canonical UX spec
2. A wireframe brief derived from the UX spec
3. A frontend dependency exploration memo
4. A frontend build brief derived from the UX spec plus approved dependency decisions
5. A backend build brief derived from the UX spec
6. An explicit open-questions log

The canonical UX spec is the parent artifact. The other artifacts should be derived from it, not authored independently.

---

## Core principle

Do not ask one agent to simultaneously:

- [ ] invent the product
- [ ] define the UX
- [ ] design the wireframes
- [ ] define the APIs
- [ ] write the implementation plan

That usually produces vague output.

Instead, prompt in stages:

1. constrain
2. decide
3. specify
4. derive handoff briefs
5. run ambiguity checks

---

## Recommended workflow

### Phase 1: Constrain the problem

Goal: make the agent restate the real constraints before it proposes UX.

Ask the agent to extract:

- [ ] product goals
- [ ] explicit non-goals
- [ ] repo architecture constraints
- [ ] accessibility constraints
- [ ] mobile/responsive expectations
- [ ] known backend constraints
- [ ] known unknowns

Expected output:

- [ ] a short constraint summary
- [ ] a short list of ambiguities that need decisions

Prompt pattern:

```text
Read AGENTS.md, docs/kanban-app-requirements.md, and docs/app-architecture-overview.md.
Summarize the constraints that must shape the UX spec for the Kanban app.
Separate:
1. product requirements
2. implementation constraints
3. accessibility constraints
4. unresolved questions
Do not propose layouts yet.
```

---

### Phase 2: Define the slice being specified

Goal: keep the agent focused on one deliverable slice at a time.

For this repo, avoid prompting for "the whole Kanban app" in one pass. Prefer slices such as:

- [ ] board list and board entry
- [ ] single board view
- [ ] card creation and editing
- [ ] card detail panel or modal
- [ ] move and reorder behavior
- [ ] filters and grouping
- [ ] mobile board interaction model

Expected output:

- [ ] feature slice name
- [ ] user value
- [ ] in-scope tasks
- [ ] out-of-scope tasks
- [ ] dependencies on other slices

Prompt pattern:

```text
Using the extracted constraints, define the UX-spec scope for the slice: <slice name>.
Return:
- [ ] primary user goal
- [ ] in-scope tasks
- [ ] out-of-scope tasks
- [ ] prerequisite slices
- [ ] risky assumptions
Keep the scope tight enough for one implementation milestone.
```

---

### Phase 3: Define user jobs and flows

Goal: get the behavioral model before screen design details.

Ask the agent to define:

- [ ] primary user persona or actor
- [ ] job to be done
- [ ] entry points into the flow
- [ ] success path
- [ ] alternate paths
- [ ] failure paths
- [ ] stop conditions

Expected output:

- [ ] numbered task flows
- [ ] preconditions and postconditions for each flow

Prompt pattern:

```text
For the slice <slice name>, define the user workflows before describing UI.
For each flow include:
- [ ] trigger
- [ ] user intent
- [ ] steps
- [ ] system responses
- [ ] failure cases
- [ ] final state
- [ ] any permissions or ownership assumptions
```

---

### Phase 4: Build the screen inventory

Goal: enumerate every surface the user can see or interact with.

Ask the agent to list:

- [ ] routes
- [ ] panels
- [ ] dialogs
- [ ] popovers
- [ ] inline edit states
- [ ] empty states
- [ ] error states
- [ ] loading states
- [ ] success confirmations

Expected output:

- [ ] a complete screen and state inventory

Prompt pattern:

```text
For the approved workflows, list every user-facing surface and state required to support them.
Include routes, overlays, inline states, empty states, loading states, error states, and success states.
Do not skip transient UI states.
```

---

### Phase 5: Turn each screen into a precise UX spec

Goal: make each surface implementation-ready.

For each screen or interaction surface, require the agent to specify:

- [ ] purpose
- [ ] entry conditions
- [ ] layout regions
- [ ] visible content blocks
- [ ] interactive controls
- [ ] control labels
- [ ] default values
- [ ] validation rules
- [ ] enabled and disabled states
- [ ] loading, empty, success, and error behavior
- [ ] keyboard behavior
- [ ] focus behavior
- [ ] accessibility labels or announcements where relevant
- [ ] mobile behavior
- [ ] desktop behavior
- [ ] reduced-motion expectations

Expected output:

- [ ] one structured section per surface

Prompt pattern:

```text
Expand the screen inventory into a structured UX spec.
For each surface include:
- [ ] goal
- [ ] entry condition
- [ ] content hierarchy
- [ ] controls
- [ ] field definitions
- [ ] validation
- [ ] interaction rules
- [ ] keyboard behavior
- [ ] focus management
- [ ] loading/empty/error/success states
- [ ] mobile adjustments
- [ ] accessibility notes
Be concrete enough that another agent does not have to invent behavior.
```

---

### Phase 6: Define cross-screen interaction rules

Goal: capture rules that do not belong to a single screen.

For the Kanban app, this is where the agent should specify things like:

- [ ] drag-and-drop and its keyboard alternative
- [ ] card reorder feedback
- [ ] move conflict behavior
- [ ] filter persistence
- [ ] grouping behavior
- [ ] selection persistence
- [ ] autosave or explicit save behavior
- [ ] optimistic UI expectations
- [ ] live announcements for important updates
- [ ] modal open/close/focus return behavior

Expected output:

- [ ] one section for global interaction contracts

Prompt pattern:

```text
Define the cross-screen interaction rules for this slice.
Include global behaviors such as keyboard alternatives, focus restoration, announcements, persistence, conflict handling, and state continuity across views.
```

---

### Phase 7: Add implementation-facing annotations

Goal: make the UX spec useful to coding agents without turning it into code too early.

Ask the agent to annotate the UX spec with:

- [ ] required data entities visible to the user
- [ ] user-visible attributes for each entity
- [ ] implied reads and writes
- [ ] validation-sensitive fields
- [ ] permissions and ownership assumptions
- [ ] places where concurrency matters
- [ ] places where backend errors must map to clear UI states

Expected output:

- [ ] an implementation notes section attached to the UX spec

Prompt pattern:

```text
Annotate the UX spec with implementation-facing notes.
For each flow or surface, identify:
- [ ] data shown to the user
- [ ] write operations implied by the UX
- [ ] validation-sensitive fields
- [ ] permission checks
- [ ] conflict-prone interactions
- [ ] backend dependencies that affect visible behavior
Do not design APIs yet.
```

---

### Phase 8: Derive the wireframe brief

Goal: hand the UX design agent only what it needs to produce high-quality wireframes.

The derived wireframe brief should include:

- [ ] slice objective
- [ ] user flows to visualize
- [ ] screen inventory
- [ ] content hierarchy
- [ ] interaction notes
- [ ] responsive variants
- [ ] state variants to show
- [ ] accessibility callouts
- [ ] visual constraints or tone guidance
- [ ] items intentionally left open for design exploration

Prompt pattern:

```text
Using the canonical UX spec only, derive a wireframe brief for a UX design agent.
Return:
- [ ] screens to design
- [ ] required variants
- [ ] annotations to show on wireframes
- [ ] interaction notes
- [ ] responsive notes
- [ ] accessibility callouts
- [ ] open design questions
Do not change product behavior while deriving the brief.
```

---

### Phase 9: Explore frontend library decisions

Goal: identify frontend capabilities that may require a library choice and force a human engineer decision before implementation.

Run this phase after the UX spec is concrete enough to reveal the interaction requirements, but before finalizing the frontend build brief.

This is the phase where the team should explicitly evaluate categories such as:

- [ ] drag-and-drop or sortable list support
- [ ] form state and validation handling
- [ ] collection primitives for complex menus, selects, comboboxes, or command-style interactions
- [ ] virtualization or large-list performance helpers
- [ ] motion or animation helpers beyond what existing primitives comfortably support
- [ ] any other non-trivial frontend dependency the coding agent would otherwise choose implicitly

For each category, require the exploration to answer:

- [ ] is a new library actually needed
- [ ] can the requirement be satisfied with the current stack
- [ ] if Tamagui-specific, is there a smallest official Tamagui package that fits
- [ ] candidate libraries or approaches
- [ ] fit with TanStack Start, React 19, TypeScript, Tamagui, and the current test stack
- [ ] accessibility and keyboard-operability implications
- [ ] mobile and touch implications
- [ ] bundle size and complexity tradeoffs
- [ ] recommended option
- [ ] explicit decision the human engineer must approve
- [ ] whether to install now, defer, or avoid entirely

Repo-specific guardrails:

- [ ] do not install a dependency only because it was explored
- [ ] prefer the smallest official Tamagui package when the need is Tamagui-specific
- [ ] keep all `@tamagui/*` packages on the same version
- [ ] do not let the frontend agent silently choose a library for a high-impact interaction

Expected output:

- [ ] a frontend dependency exploration memo
- [ ] a human decision checklist for dependency choices
- [ ] a list of approved, deferred, and rejected options

Prompt pattern:

```text
Using the canonical UX spec for <slice>, identify frontend capabilities that may require explicit library decisions by a human engineer before implementation.
At minimum review:
- [ ] drag-and-drop / sortable interactions
- [ ] form state + validation handling
- [ ] any other non-trivial frontend library categories implied by the UX
For each category, return:
- [ ] whether a new library is needed at all
- [ ] candidate options
- [ ] fit with this repo's stack and constraints
- [ ] accessibility and keyboard implications
- [ ] testing implications
- [ ] mobile/responsive implications
- [ ] recommendation
- [ ] decision that requires human sign-off
- [ ] whether to defer installation until the slice is approved
Do not install anything. Do not finalize the frontend implementation brief until this exploration is complete.
```

---

### Phase 10: Derive the frontend build brief

Goal: hand the frontend coding agent a behaviorally complete spec.

The derived frontend brief should include:

- [ ] approved dependency choices or an explicit no-new-library decision
- [ ] any deferred dependency decisions that still require human approval
- [ ] routes and surfaces to build
- [ ] component responsibilities
- [ ] Tamagui-first composition expectations
- [ ] local state vs Query vs Redux expectations
- [ ] query and mutation touchpoints implied by the UX
- [ ] form rules
- [ ] accessibility acceptance criteria
- [ ] responsive acceptance criteria
- [ ] visual and interaction edge cases

For this repo, the frontend brief should explicitly preserve:

- [ ] only approved dependency choices for high-impact interactions
- [ ] Tamagui primitives over raw HTML when practical
- [ ] keyboard-operable interactions
- [ ] `PrettyModalWrap` for modal flows
- [ ] Query for remote data
- [ ] Redux only for true shared client state

Prompt pattern:

```text
Using the canonical UX spec only, derive a frontend implementation brief.
Incorporate the approved outputs of the frontend dependency exploration memo.
Map the UX into:
- [ ] routes or screens
- [ ] approved libraries or explicit no-library decisions
- [ ] component responsibilities
- [ ] state ownership expectations
- [ ] mutation and query needs
- [ ] validation and error display rules
- [ ] accessibility requirements
- [ ] responsive behavior
Keep the brief implementation-facing but not code-level.
```

---

### Phase 11: Derive the backend build brief

Goal: hand the backend coding agent a behaviorally grounded contract.

The derived backend brief should include:

- [ ] entities involved
- [ ] reads and writes required by the UX
- [ ] ownership rules
- [ ] validation requirements
- [ ] soft-delete expectations
- [ ] concurrency-sensitive mutations
- [ ] error cases the UI depends on
- [ ] logging expectations for important flows

For this repo, the backend brief should explicitly preserve:

- [ ] tRPC procedures with zod `.input(...)`
- [ ] explicit `ownerId` handling in services
- [ ] `deleted_at IS NULL` filtering on owned reads
- [ ] row ownership validation on referenced ids
- [ ] reorder and move operations in transactions
- [ ] `SELECT ... FOR UPDATE` on moved rows
- [ ] `version` conflict handling
- [ ] `TRPCError` for server-side errors
- [ ] RLS enablement and explicit policies for new or changed `public` tables

Prompt pattern:

```text
Using the canonical UX spec only, derive a backend implementation brief.
Map the UX into:
- [ ] required entities
- [ ] read operations
- [ ] write operations
- [ ] validation rules
- [ ] ownership and permission checks
- [ ] concurrency-sensitive flows
- [ ] error conditions that must be surfaced consistently
Do not invent extra endpoints that the UX does not require.
```

---

### Phase 12: Run ambiguity and completeness checks

Goal: force the agent to identify what still requires guessing.

Ask the agent to review the full package and list:

- [ ] places where a wireframe agent would still guess
- [ ] places where a frontend agent would still guess
- [ ] places where a backend agent would still guess
- [ ] conflicting requirements
- [ ] missing error states
- [ ] missing empty states
- [ ] missing mobile rules
- [ ] missing keyboard rules
- [ ] missing ownership or concurrency decisions

Expected output:

- [ ] a blocking issues list
- [ ] a non-blocking open questions list
- [ ] a definition-of-ready verdict

Prompt pattern:

```text
Audit the canonical UX spec and the three derived briefs.
List any place where a downstream agent would still need to guess.
Group findings by:
- [ ] wireframe ambiguity
- [ ] frontend ambiguity
- [ ] backend ambiguity
- [ ] missing state coverage
- [ ] conflicting assumptions
Then state whether the spec package is ready for implementation.
```

---

## Canonical UX spec outline

Use this structure for the actual UX spec document:

1. Overview
2. Slice goal
3. Users and jobs to be done
4. In-scope tasks
5. Out-of-scope tasks
6. Assumptions and dependencies
7. Workflow definitions
8. Screen and state inventory
9. Detailed surface specs
10. Cross-screen interaction rules
11. Data visible to the user
12. Validation and error handling
13. Accessibility requirements
14. Responsive behavior
15. Open questions
16. Acceptance criteria

---

## Frontend dependency exploration memo outline

Use this structure for the frontend dependency exploration memo:

1. Slice name
2. Capability being evaluated
3. Why the UX creates this dependency question
4. Current-stack option
5. Candidate library options
6. Accessibility and keyboard analysis
7. Mobile and responsiveness analysis
8. Testing and maintenance analysis
9. Recommendation
10. Human decision required
11. Install timing (`now`, `later`, `not needed`)

This memo is a sibling artifact to the canonical UX spec, not a replacement for it.

---

## Definition of ready for the UX spec

The UX spec is ready only when all of the following are true:

- [ ] every important user task has a defined start, middle, and end state
- [ ] every screen has loading, empty, error, and success behavior where applicable
- [ ] every modal, panel, or overlay has open, close, focus, and keyboard behavior
- [ ] every drag interaction has a non-drag keyboard alternative
- [ ] every form field has labels, defaults, validation, and failure behavior
- [ ] mobile behavior is described, not assumed
- [ ] backend-dependent behaviors are called out explicitly
- [ ] conflict-prone interactions describe what the user sees when a conflict happens
- [ ] library-dependent frontend interactions have either an approved approach or an explicit human decision gate
- [ ] the frontend and backend briefs can be derived without changing the UX

---

## Recommended Kanban authoring order for this repo

Because the app is still mostly a scaffold, author UX specs in this order:

1. Board shell and board loading states
2. Card create and edit flows
3. Card detail panel or modal
4. Card move and reorder behavior
5. Column create and reorder behavior
6. Filters and grouping
7. Empty states and first-run onboarding
8. Mobile adaptations

This reduces the chance of designing advanced states before the core board interaction model is stable.

---

## Common prompting mistakes to avoid

- [ ] "Design a Kanban app UX" with no slice boundaries
- [ ] asking for visual design before the workflows are settled
- [ ] skipping empty, error, loading, and conflict states
- [ ] letting the agent assume desktop behavior also works on mobile
- [ ] letting drag-and-drop stand in for full keyboard interaction
- [ ] letting a coding agent implicitly choose drag-and-drop, form, or other major frontend libraries without human sign-off
- [ ] deriving frontend and backend briefs from memory instead of from the canonical UX spec
- [ ] mixing product decisions and implementation decisions in the same unresolved paragraph

---

## Success criterion

If the workflow is working, a downstream agent should be able to say:

- [ ] "I know exactly which surfaces to design."
- [ ] "I know which frontend library decisions need human approval before coding."
- [ ] "I know exactly what behavior to implement."
- [ ] "I know exactly which backend capabilities the UX requires."

without needing to invent critical product behavior.
