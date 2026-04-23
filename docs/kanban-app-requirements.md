# Kanban Board Product + Backend API

Build a small Kanban board product with:
- A frontend application (React)
- A backend API server

---

## Core Requirements

### Frontend (Kanban product)

Your app must support:

- Create, edit, delete cards (title + description minimum)
- Card details panel (e.g. tags, subtasks, or comments - at least one)
- Move cards between columns
- Reorder cards within a column (drag-and-drop or similar UX)
- Column creation and reordering
- Filter cards by at least one attribute
- Group cards by an attribute (board reorganizes when grouping changes)
- Mobile responsiveness (usable on smaller screens)

**State management**
- Use an approach suitable for a real product
- Briefly explain your choice in the README

**UI/UX expectations**
- Clear component structure (Board, Column, Card, Filters, etc.)
- Good visual hierarchy and spacing
- Keyboard-friendly modals/forms and focus management
- Reasonable accessibility defaults

TypeScript is strongly preferred.

Tests are required for core logic (create/move/filter/group).

---

### Backend (API server)

Implement HTTP APIs that power the Kanban experience.

The server must:

- Be type-safe
- Validate inputs and return consistent errors
- Include structured logging
- Include tests for core paths

**Minimum functionality**

- Persist boards, columns, and cards (SQLite/Postgres/etc.)
- Database schema with migrations
- APIs for:
  - CRUD cards
  - Moving cards between columns
  - Reordering cards within a column
  - Listing cards with filters and pagination
- Soft delete for cards
- Basic concurrency safety for reordering operations

You may assume a single user (no auth required).

---

## Evaluation Criteria (20 points total)

- **Frontend implementation - 7**
  UI correctness, state handling, component structure, responsiveness

- **Product & interaction design - 6**
  User flows, UX decisions, visual clarity, edge cases

- **Backend implementation - 5**
  API correctness, type safety, validation, tests, logging

- **Infrastructure & setup - 2**
  Local setup simplicity and defaults

---

## Documentation (README)

Include:

- Setup/run instructions
- Architecture overview
- State management approach
- Database + schema overview
- API overview
- Key UX decisions
- Trade-offs and future improvements

---

## Tips

- Start with a working end-to-end Kanban flow
- Keep the backend focused on supporting the UX
- Favor clarity over feature count
- Make design decisions explicit
- Clean code beats clever code

---

## Submission

- Source code
- README
- Assumptions and trade-offs
- Deployed demo link