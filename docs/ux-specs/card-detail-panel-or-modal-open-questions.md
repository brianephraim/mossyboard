# Open Questions Log: Card Detail Panel or Modal

## 1. Product Questions

### Question: Should completed subtasks eventually move into their own collapsible section?

- Current assumption in the canonical spec: completed subtasks stay inline in stored order
- Alternative: split the detail surface into active and completed subtask sections later
- Status: open
- Blocking: no

### Question: When more card-detail features arrive, should they appear as stacked sections or tabbed subsections?

- Current assumption in the canonical spec: only the first detail feature, subtasks, exists in this slice
- Alternative: future comments or attachments could introduce tabs
- Status: open
- Blocking: no

## 2. Recorded Decisions

- desktop detail surface: right-side panel
- mobile detail surface: full-screen modal
- route state: `/boards/$boardId?card=$cardId`
- first detail model: `subtasks`
- subtask ordering stays inline; completed items do not auto-sort
- subtask delete has no confirmation dialog in this slice
- subtask reorder is deferred

## 3. Future-Slice Coordination Questions

### Question: When card move and reorder arrive, should the detail surface expose move actions directly or stay read-write for fields only?

- Current assumption: move and reorder remain board-level interactions, not detail-surface controls
- Status: open
- Blocking: no for this slice, yes for later move/reorder work

## 4. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
- Non-blocking engineering sign-offs: 0
- Non-blocking future-slice coordination questions: 1
