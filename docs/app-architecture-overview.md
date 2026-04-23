# App Architecture Overview

## Frontend App

### Framework

- TanStack Start (SPA mode)
- TanStack Start provides the application shell and is the initial framework bootstrap point
- TanStack Router and TanStack Query are configured as part of the TanStack Start app setup rather than as separate adoption phases

### Routing

- TanStack Router
- Route-level loaders for page entry orchestration

### Server State

- TanStack Query
- Request caching
- Invalidation and refetch behavior
- Per-resource query keys

### App State

- Redux Toolkit
- Shared client state across features

### Local UI State

- React component state for short-lived concerns
  - open/closed UI
  - hover state
  - temporary form values
  - drag interactions

### UI Layer

- Presentational components
- Feature-level components
- Shared design system components

### Styling

- Tamagui
- Theme tokens and design system configuration
- Style-as-props approach for UI composition

---

## State Management Model

### Server State (TanStack Query)

- Owns fetched data lifecycle
- Handles caching, background refetching, and errors

### App State (Redux Toolkit)

- Owns shared client-side state
- Coordinates cross-feature behavior
- Persists session-level interaction state

### Local State (React)

- Owns temporary, component-scoped concerns

### Guiding Rule

- Avoid duplicating the same data across Query and Redux

---

## Redux Toolkit Layer

### Store

- Centralized Redux store
- Configured at app bootstrap

### Slices

- Organized by domain or capability
- Encapsulate related state and reducers

### Selectors

- Encapsulate state reads
- Provide stable access patterns

### Reducers / Actions

- Handle synchronous state transitions

### Middleware

- Optional for logging, analytics, workflows, side effects

### Typical Use Cases

- UI preferences
- active selections
- multi-step workflows
- client-side filters and sorting
- cross-component coordination

---

## Data Access Layer

### Domain API

- Abstracts business operations
- Examples:
  - `getResource(id)`
  - `getPageData(input)`
  - `updateThing(input)`
- Shields UI from transport details

### Query Hooks

- Wrap domain API using TanStack Query
- Handle:
  - caching
  - stale time
  - retries
  - invalidation
  - background refetching

### Mutation Hooks

- Wrap write operations
- Handle:
  - success flows
  - invalidation
  - optimistic updates
  - optional Redux coordination

---

## Transport Layer

### Aggregate Fetches

- Used for initial page loads
- Single request returns composed payload

### Client-Side Batchers

- Used for repeated fine-grained lookups
- Responsibilities:
  - collect calls briefly
  - send one backend request
  - resolve individual promises
- Important:
  - batching is hidden below domain API

### Mutation Transport

- Prefer explicit operation endpoints
- Use bulk endpoints where appropriate
- Avoid generic mutation batching

---

## Backend Layer

### Server Functions / Server Routes

- Entry points from frontend
- Validate input
- Shape responses

### Application Services

- Contain business logic
- Coordinate reads and writes

### Persistence Layer

- Supabase Postgres is the system of record for application data
- Database access
- Repositories or query modules
- Isolated from transport layer
- Schema changes are managed through migrations
- Any new or altered tables in schema `public` require RLS enablement and explicit policies
- The first persistence-backed proof of wiring is an unauthenticated all-visitor-shared click counter

---

## Authentication and Email Delivery

### Authentication Provider

- Firebase is used for authentication only
- Email/password is the initial sign-in method
- Authentication concerns stay separate from hosting and application persistence

### Auth Client Boundary

- The frontend owns session observation and auth UI flows
- Shared authenticated session state may be exposed to the rest of the app through focused auth modules
- Feature code should depend on auth state abstractions rather than Firebase SDK calls spread across the UI

### Email Delivery

- Resend is the transactional email provider for auth-related emails
- Email delivery should be triggered through explicit server-side flows rather than directly from UI components
- Provider-specific email logic should stay isolated behind a mail delivery module
- When the application owns Firebase auth email delivery, a server-side auth module generates the required action links and delegates delivery to Resend

---

## Bootstrap Sequence

### Initial Setup Order

- Start with `package.json` and base scripts so install, dev, build, and test workflows exist from the beginning
- Set up TanStack Start as the first framework milestone, including routing and query bootstrapping in the app shell
- Set up Supabase-backed persistence before authentication work begins
- Add the first persistence-backed vertical slice as an unauthenticated all-visitor-shared click counter
- Layer in Firebase authentication after the database-backed request path is working
- Add Resend-backed auth email flows after the Firebase auth baseline is working
- Add shared client state only when a concrete cross-feature need appears
- Introduce Tamagui after the app shell, Supabase baseline, and auth baseline are working, and before broader product UI buildout
- Add broader product flows after the supporting platform layers are proven

### First Vertical Slice

- A single route should render a simple shared click counter page backed by one database-backed endpoint or server action
- The counter is intentionally unauthenticated so the first proof focuses on framework wiring, request handling, and Supabase-backed persistence
- The first slice should verify that multiple visitors see the same shared value update through the real backend path

---

## Configuration

### Environment Variables

- Local development reads from `.env`
- Deployment environments provide the same required variables through platform configuration
- Firebase, Resend, and Supabase configuration should be centralized in dedicated setup modules rather than read ad hoc throughout the codebase

---

## Caching Strategy

### Page-Level Data

- Cached via aggregate queries

### Resource-Level Data

- Cached per entity
  - `['resource', id]`
  - `['collection', params]`

### Deduping

- TanStack Query dedupes identical in-flight requests
- Batchers merge distinct requests within a short window

### Invalidation

- Mutations invalidate only affected data

### Redux Boundary

- Redux is not used as a backend cache
- Query remains the source of truth for remote data

---

## Application Flow

### Initial Route Entry

- Loader or initial query fetches required data
- Query cache is populated

### Ongoing Reads

- Components use query hooks
- Batchers may group repeated lookups

### Client State Changes

- Redux actions update shared client state

### Writes

- Mutations call domain API
- Backend processes logic
- Client updates Query cache and optionally Redux state

---

## Separation of Concerns

- UI Layer → rendering and interaction
- Styling → Tamagui-based design system and theming
- Local State → temporary component concerns
- Redux Toolkit → shared client state
- TanStack Query → server data lifecycle
- Transport → request shaping and batching
- Business Logic → application rules
- Persistence → data storage and retrieval

---

## Recommended Folder Structure

src/
routes/
route definitions and loaders

features/
<feature>/
components/
api/
queries/
state/ # Redux slices, selectors

app/
store/ # Redux store setup

lib/
batching/ # batcher utilities
query/ # query client and helpers

server/
functions/ # server entry points
services/ # business logic
repos/ # data access

ui/
shared UI components (Tamagui-based)

---

## Testing Strategy

### Unit and Service Tests

- Vitest is the primary test runner for unit and service-level tests
- `node:assert/strict` provides assertions for core logic and domain behavior

### Component and Hook Tests

- `@testing-library/react` is used for component and hook tests
- jsdom provides the browser-like environment for React test execution

### End-to-End Tests

- Playwright covers critical browser flows in Chromium

### Test Design Principles

- Keep business logic in testable services, reducers, selectors, and domain functions
- Keep transport and persistence boundaries testable through focused integration paths
- Cover critical user flows with end-to-end tests rather than duplicating every interaction at every layer

---

## Guiding Principles

- Use TanStack Query for remote data
- Use Redux Toolkit for shared client state
- Use React state for local concerns
- Use Tamagui for consistent styling and theming
- Prefer aggregate fetches for initial loads
- Batch only when necessary
- Keep batching out of UI components
- Keep Redux and Query responsibilities separate
- Avoid duplicating remote data across layers
