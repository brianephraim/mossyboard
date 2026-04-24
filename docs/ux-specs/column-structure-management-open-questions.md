# Open Questions Log: Column Structure Management

## 1. Product Questions

### Question: Should future column management support delete or merge behavior?

- Current assumption in the canonical spec: column delete remains out of scope
- Alternative: later allow delete with explicit card-migration or card-archive behavior
- Status: open
- Blocking: yes for any future `column.softDelete` backend work, no for this slice

### Question: Should boards eventually support column templates or presets?

- Current assumption in the canonical spec: create is title-only
- Status: open
- Blocking: no

## 2. Recorded Decisions

- use `react-hook-form`
- create is title-only
- create supports board-end and add-after-existing insertion
- rename is inline
- no blocking discard dialog is required for unsaved create or rename text

## 3. Tracking Summary

- Blocking questions: 1 future-only question
- Non-blocking product questions: 1
- Non-blocking engineering sign-offs: 0
