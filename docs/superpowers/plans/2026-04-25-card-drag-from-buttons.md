# Card drag from buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow dragging cards from anywhere, including starting over interior buttons, without breaking normal button clicks when no drag occurs.

**Architecture:** Use `@hello-pangea/dnd` `Draggable` with a full-card drag handle. Enable drag starts from interactive elements via `disableInteractiveElementBlocking`, relying on the library’s drag slop and `shouldBlockNextClick` to preserve “click vs drag” behavior.

**Tech Stack:** React, TypeScript, Tamagui, `@hello-pangea/dnd`.

---

### Task 1: Make the full card a drag handle

**Files:**
- Modify: `src/features/boards/BoardCanvas.tsx`

- [ ] **Step 1: Move `dragHandleProps` to the card root**
  - In `CardInterior`, apply `dragHandleProps` to the outer `YStack` so title/description/buttons all participate.
  - Remove the dedicated header `div` that previously carried the handle.

- [ ] **Step 2: Allow drag starts from interactive elements**
  - In the `Draggable` that renders cards, pass `disableInteractiveElementBlocking` so starting a drag over a button can work.

- [ ] **Step 3: Manual verification**
  - Drag starts from title, description, whitespace.
  - Press `Open` and release with no movement → opens card.
  - Press `Open`, move and drop card → card moves; `Open` does not trigger after the drag.

### Task 2: Format + lint

**Files:**
- Modify: `src/features/boards/BoardCanvas.tsx`

- [ ] **Step 1: Run prettier**
  - Run: `npx prettier --write src/features/boards/BoardCanvas.tsx`

- [ ] **Step 2: Check lints for edited file**
  - Ensure no new TypeScript/ESLint issues are introduced.

