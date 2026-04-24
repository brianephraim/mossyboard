# Open Questions Log: Authentication and Session Boundaries

## 1. Product Questions

### Question: What should the long-term signed-out entry route be?

- Current assumption in the canonical spec: `/` remains a lightweight public landing route
- Alternative: signed-out users are redirected directly to `/auth`
- Status: open
- Blocking: no
- Why it matters:
  - affects landing-page investment
  - affects future app entry expectations

### Question: When do terms and privacy routes need to become real pages?

- Current assumption in the canonical spec: placeholder copy is acceptable in this slice
- Alternative: real legal routes are required before launch
- Status: open
- Blocking: no
- Why it matters:
  - affects create-account copy and link targets

## 2. Recorded Engineering Decisions

These were decided after the dependency interview and are recorded in [`docs/frontend-library-decisions.md`](../frontend-library-decisions.md):

- auth forms: `react-hook-form`
- auth mode switch: `@tamagui/tabs`
- future drag-and-drop for cards/columns: `@hello-pangea/dnd`
- future virtualization partner for DnD lists: `react-window`
- future complex selects/comboboxes/filter menus: prefer official Tamagui packages
- future toasts / undo / transient status UI: prefer official Tamagui packages
- extra motion library: defer

## 3. Future-Slice Coordination Questions

### Resolved in later slice: protected-shell placement

- Reminder-banner placement is now defined in [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md) as below the protected shell header.
- Protected-context sign-out placement is now defined in [`docs/ux-specs/board-shell-and-board-loading-states.md`](./board-shell-and-board-loading-states.md) as a persistent shell-header action.
- Status: resolved
- Blocking: no

## 4. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
- Non-blocking engineering sign-offs: 0
- Non-blocking future-shell coordination questions: 0
