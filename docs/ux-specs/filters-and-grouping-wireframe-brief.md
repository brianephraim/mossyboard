# Wireframe Brief: Filters and Grouping

## 1. Source of Truth

This brief is derived from [`docs/ux-specs/filters-and-grouping.md`](./filters-and-grouping.md) only. Do not change product behavior while designing wireframes.

## 2. Slice Objective

Visualize board-level filter controls, board regrouping by priority, and the matching-cards list view with pagination.

## 3. Scope for the Wireframe Agent

Include only:

- filter controls
- grouping controls
- board view grouped by column
- board view grouped by priority
- matching-cards list view
- empty, loading, and error states for list mode

Do not design:

- search
- saved views
- additional filter attributes
- server-shaped grouped views

## 4. Behavior Constraints to Preserve

- Priority is the only filter and grouping attribute.
- Board view supports `Column` and `Priority` grouping.
- List view is flat and paginated.
- Filters persist across board and list view switches.
- Grouping applies only in board view.

## 5. User Flows to Visualize

1. Open filters and select priorities
2. Group board by priority
3. Return to group-by-column board
4. Switch to matching-cards list view
5. Load more list results
6. Hit empty or error states in list mode

## 6. Screens to Design

| ID  | Screen                     | Required variants                     |
| --- | -------------------------- | ------------------------------------- |
| A1  | Board toolbar              | default                               |
| A2  | Filter controls            | one or more priorities selected       |
| B1  | Board view                 | grouped by column with active filters |
| B2  | Board view                 | grouped by priority                   |
| B3  | Board view                 | grouped empty groups                  |
| C1  | Matching-cards list        | loading                               |
| C2  | Matching-cards list        | loaded                                |
| C3  | Matching-cards list        | empty                                 |
| C4  | Matching-cards list        | initial error                         |
| C5  | Matching-cards list footer | next-page loading or error            |

## 7. Required Copy

- `Filters`
- `Clear filters`
- `Board view`
- `List view`
- `Group by`
- `Column`
- `Priority`
- `Loading matching cards...`
- `No cards match these filters.`
- `Try changing or clearing your filters.`
- `We couldn't load matching cards.`
- `Retry`
- `Load more`

## 8. Annotations to Show

- exact route-state label such as `view=board`, `groupBy=priority`
- how filters persist across view changes
- where grouping is hidden in list view
- list row metadata requirements
- live-region announcements for filter and pagination updates

## 9. Responsive Notes

- Filter controls may become a compact menu or sheet on narrow screens.
- Grouped board view should still communicate original column context when grouped by priority.
- List rows may stack metadata vertically on narrow screens.

## 10. Accessibility Callouts

- semantic selected state for filters and view/group controls
- non-color empty, loading, and error states
- live-region announcements for filter updates and list pagination

## 11. Open Design Questions

1. How visually prominent should active filter state be in the board toolbar?
2. How distinct should priority-grouped lanes feel from normal workflow columns?
