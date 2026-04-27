# Card Edge Move Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-card arrow buttons with slick 4-edge chevron move controls that appear on hover or keyboard focus-within.

**Architecture:** Implement an overlay in `CardInterior` that renders 4 absolutely-positioned edge buttons (≈25px thick) and toggles their visibility based on local hover/focus-within state. Keep existing move handlers (`onMove(cardId, direction)`), only change presentation.

**Tech Stack:** React + Tamagui (`@tamagui/core`, `@tamagui/button`) in `src/features/boards/BoardCanvas.tsx`.

---

### Task 1: Implement edge overlay controls

**Files:**

- Modify: `src/features/boards/BoardCanvas.tsx` (`CardInterior`)

- [ ] **Step 1: Add edge size constant and focus/hover visibility state**
- [ ] **Step 2: Replace inline arrow move buttons with a 4-edge overlay**
  - Left edge: move left one column
  - Right edge: move right one column
  - Top edge: move up one place
  - Bottom edge: move down one place
- [ ] **Step 3: Use chevron glyphs and hover styles**
- [ ] **Step 4: Ensure accessibility**
  - Reveal on keyboard focus-within
  - `aria-label` for each edge button

### Task 2: Verify formatting and lints

**Files:**

- Format: `src/features/boards/BoardCanvas.tsx`

- [ ] **Step 1: Run Prettier on modified file**
- [ ] **Step 2: Check lints for modified file**
