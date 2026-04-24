# Open Questions Log: Card Create and Edit Flows

## 1. Product Questions

### Question: Should rapid card entry stay one-at-a-time or become a keep-open composer later?

- Current assumption: composer closes after each successful create
- Status: open
- Blocking: no

### Question: Should priority remain a fixed four-option set?

- Current assumption: `none`, `low`, `medium`, `high`
- Status: open
- Blocking: no

## 2. Recorded Decisions

- use `react-hook-form`
- use `PrettyModalWrap`
- create is title-first only
- edit uses explicit save
- delete requires confirmation and has no undo in this slice

## 3. Future-Slice Coordination Notes

### Resolved in sibling slice: card detail surface container

- The detail-surface container is now defined in [`docs/ux-specs/card-detail-panel-or-modal.md`](./card-detail-panel-or-modal.md).
- Desktop uses a right-side panel.
- Mobile uses a full-screen modal.
- Status: resolved
- Blocking: no

## 4. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
