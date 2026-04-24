# Open Questions Log: Filters and Grouping

## 1. Product Questions

### Question: Should future board filtering add text search?

- Current assumption in the canonical spec: no text search in this slice
- Status: open
- Blocking: no

### Question: Should empty priority groups be collapsible in grouped board view?

- Current assumption in the canonical spec: they remain visible unless filters hide them
- Status: open
- Blocking: no

## 2. Recorded Decisions

- `priority` is the first and only filter/group attribute
- board view supports `Column` and `Priority` grouping
- list view is flat and paginated
- grouping remains client-side in board view
- `card.listByBoard` is the backend for list mode

## 3. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
- Non-blocking engineering sign-offs: 0
