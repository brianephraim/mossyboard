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

## 2. Engineering Decision Gates

### Question: Should the auth/session slice remain dependency-free on the frontend?

- Recommendation from the dependency memo: yes
- Candidate alternatives:
  - `@tanstack/react-form`
  - `react-hook-form`
  - `@tamagui/tabs`
- Status: pending engineer sign-off
- Blocking: no for documentation, low-risk yes for final implementation kickoff if the team wants an explicit standardized pattern first

### Question: Should drag-and-drop evaluation be deferred to the move/reorder slice?

- Recommendation from the dependency memo: yes
- Status: pending engineer sign-off
- Blocking: no

## 3. Future-Slice Coordination Questions

### Question: Where should the reminder banner live inside the future protected shell?

- Current assumption: top-level protected shell integration point
- Status: open
- Blocking: no for this slice's documentation, yes for polished board-shell wireframes later

### Question: Where should the persistent sign-out affordance live in the eventual protected shell?

- Current assumption: accessible from any protected context, exact placement deferred
- Status: open
- Blocking: no

## 4. Tracking Summary

- Blocking questions: none
- Non-blocking product questions: 2
- Non-blocking engineering sign-offs: 2
- Non-blocking future-shell coordination questions: 2
