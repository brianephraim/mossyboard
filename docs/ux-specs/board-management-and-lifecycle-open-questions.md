# Open Questions Log: Board Management and Lifecycle

## 1. Product Questions

### Question: Should the product eventually support board archive separate from delete?

- Current assumption in the canonical spec: no separate archive in this slice
- Status: open
- Blocking: no

### Question: Should `/boards` eventually allow rename or delete directly from the board index?

- Current assumption in the canonical spec: destructive and lifecycle actions live on the loaded board route
- Status: open
- Blocking: no

## 2. Recorded Decisions

- board settings live on the loaded board route
- settings open in a dialog
- rename uses explicit save
- delete requires a second confirmation
- delete success returns the user to `/boards` with `Board deleted.`

## 3. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
- Non-blocking engineering sign-offs: 0
